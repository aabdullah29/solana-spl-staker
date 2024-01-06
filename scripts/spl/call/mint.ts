import {
  SystemProgram,
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { Metaplex, UploadMetadataInput } from "@metaplex-foundation/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {
  getMetaplexInstance,
  getNetworkConfig,
  uploadMetadata,
} from "../splHelper/helper";
import {
  decimals,
  image,
  isMutable,
  name,
  networkName,
  royalty,
  setMintAddress,
  setMintKeypair,
  symbol,
  totalSupply,
} from "../splHelper/consts";
require("dotenv").config();

/*
--------------
main function
--------------
*/
(async () => {
  const secretKey: any = process.env.USER_WALLET;
  const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
  console.log("userWallet address: ", userWallet.publicKey.toString());

  const network = getNetworkConfig(networkName);
  const connection = new Connection(network.cluster);
  const metaplex = getMetaplexInstance(network, connection, userWallet);

  // token ofchain metadata
  const tokenMetadata: UploadMetadataInput = {
    name: name, // token name
    symbol: symbol, // token symbol
    // image uri
    image: image,
  };

  // upload metadata
  let metadataUri = await uploadMetadata(metaplex, tokenMetadata);

  // convert metadata in V2
  const tokenMetadataV2 = {
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
    uri: metadataUri, // uploaded metadata uri
    sellerFeeBasisPoints: royalty, 
    creators: [
      { address: userWallet.publicKey, share: 100, verified:true },
    ],
    authority: userWallet,
    isMutable: isMutable,
    collection: null,
    uses: null,
  } as DataV2;

  // new solana address for token
  let mintKeypair = Keypair.generate();
  console.log(`token Address: ${mintKeypair.publicKey.toString()}`);
  // save info file
  await setMintAddress(mintKeypair.publicKey.toString());
  await setMintKeypair(mintKeypair.secretKey.toString());

  const mintTransaction: VersionedTransaction =
    await createMintTokenTransaction(
      connection,
      metaplex,
      userWallet,
      mintKeypair,
      decimals,
      totalSupply,
      tokenMetadataV2,
      userWallet.publicKey,
      userWallet.publicKey, // mintAuthority
      null, // freezeAuthority
    );

  // get chain block data
  let { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash(
    "finalized"
  );
  const transactionId = await connection.sendTransaction(mintTransaction);
  await connection.confirmTransaction({
    signature: transactionId,
    lastValidBlockHeight,
    blockhash,
  });

  console.log(`transaction Hash`, transactionId);
})();



/*
-----------------------------------------
create transaction for mint new spl token
-----------------------------------------
*/
// mint token instuction function
const createMintTokenTransaction = async (
  connection: Connection,
  metaplex: Metaplex,
  payer: Keypair,
  mintKeypair: Keypair,
  decimals: any,
  totalSupply: any,
  tokenMetadata: DataV2,
  destinationWallet: PublicKey,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null,
) => {
  const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
  const metadataPDA = metaplex
    .nfts()
    .pdas()
    .metadata({ mint: mintKeypair.publicKey });
  const tokenATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    destinationWallet
  );

  const txInstructions: TransactionInstruction[] = [];
  txInstructions.push(
    // 1st
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: requiredBalance,
      programId: TOKEN_PROGRAM_ID,
    }),
    // 2nd
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_PROGRAM_ID
    ),
    // 3rd
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      tokenATA,
      payer.publicKey,
      mintKeypair.publicKey
    ),
    // 4th
    createMintToInstruction(
      mintKeypair.publicKey,
      tokenATA,
      mintAuthority,
      totalSupply * Math.pow(10, decimals)
    ),
    // 5th
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthority,
        payer: payer.publicKey,
        updateAuthority: mintAuthority,
      },
      {
        createMetadataAccountArgsV3: {
          data: tokenMetadata,
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  );

  // get last block and initiate transaction
  const latestBlockhash = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: txInstructions,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([payer, mintKeypair]);
  return transaction;
};