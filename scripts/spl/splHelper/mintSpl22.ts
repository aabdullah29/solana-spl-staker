import {
  SystemProgram,
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  getMintLen,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createInitializeTransferFeeConfigInstruction,
  createAssociatedTokenAccountIdempotent,
  mintTo,
} from "@solana/spl-token";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  UploadMetadataInput,
} from "@metaplex-foundation/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {
  getMetaplexInstance,
  getNetworkConfig,
  txUrl,
  uploadMetadata,
} from "./helper";
require("dotenv").config();

/* 
 main function
*/
const main = async () => {
  const network = getNetworkConfig("devnet");
  const connection = new Connection(network.cluster);
  const secretKey: any = process.env.USER_WALLET;
  const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
  console.log("userWallet address: ", userWallet.publicKey.toString());

  // create metaplex instance
  const metaplex = getMetaplexInstance(network, connection, userWallet);

  // token data
  const token = {
    decimals: 6,
    totalSupply: 96000000000, //96,000,000,000
  };

  // token ofchain metadata
  const tokenMetadata: UploadMetadataInput = {
    name: "WOKE FRENS", // token name
    symbol: "Woke", // token symbol
    // image uri
    image:
      "https://bafkreievpa5j5w7mpbny3gpzvwdckculahwnvzwpnaekns5dvrj7kma5ra.ipfs.nftstorage.link/",
  };

  // upload metadata
  let metadataUri = await uploadMetadata(metaplex, tokenMetadata);

  // convert metadata in V2
  const tokenMetadataV2 = {
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
    uri: metadataUri, // uploaded metadata uri
    sellerFeeBasisPoints: 1000, // royalty 10%
    creators: [{ address: userWallet.publicKey, share: 100 }],
    collection: null,
    uses: null,
  } as DataV2;

  /* 
  // 
  */

  // Generate keys for payer, mint authority, and mint
  const payer = userWallet;
  const mintAuthority = Keypair.generate();
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // Generate keys for transfer fee config authority and withdrawal authority
  const transferFeeConfigAuthority = Keypair.generate();
  const withdrawWithheldAuthority = Keypair.generate();

  // Define the extensions to be used by the mint
  const extensions = [ExtensionType.TransferFeeConfig];

  // Calculate the length of the mint
  const mintLen = getMintLen(extensions);

  // Set the decimals, fee basis points, and maximum fee
  const decimals = 9;
  const feeBasisPoints = 100; // 1%
  const maxFee = BigInt(9 * Math.pow(10, decimals)); // 9 tokens

  // Define the amount to be minted and the amount to be transferred, accounting for decimals
  const mintAmount = BigInt(1_000_000 * Math.pow(10, decimals)); // Mint 1,000,000 tokens
  const transferAmount = BigInt(1_000 * Math.pow(10, decimals)); // Transfer 1,000 tokens

  // Calculate the fee for the transfer
  const calcFee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000); // expect 10 fee
  const fee = calcFee > maxFee ? maxFee : calcFee; // expect 9 fee

  // Step 2 - Create a New Token
  const metadataPDA = metaplex
    .nfts()
    .pdas()
    .metadata({ mint: mintKeypair.publicKey });

  const mintLamports = await connection.getMinimumBalanceForRentExemption(
    mintLen
  );
  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint,
      transferFeeConfigAuthority.publicKey,
      withdrawWithheldAuthority.publicKey,
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  const newTokenTx = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer, mintKeypair],
    undefined
  );
  console.log("New Token Created:", txUrl(newTokenTx));

  // Step 3 - Mint tokens to Owner
  const owner = Keypair.generate();
  const sourceAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    owner.publicKey,
    {},
    TOKEN_2022_PROGRAM_ID
  );
  const mintSig = await mintTo(
    connection,
    payer,
    mint,
    sourceAccount,
    mintAuthority,
    mintAmount,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log("Tokens Minted:", txUrl(mintSig));

  // const metadataTransaction = new Transaction().add(createCreateMetadataAccountV3Instruction(
  //   {
  //     metadata: metadataPDA,
  //     mint: mint,
  //     mintAuthority: mintAuthority.publicKey,
  //     payer: payer.publicKey,
  //     updateAuthority: mintAuthority.publicKey,
  //   },
  //   {
  //     createMetadataAccountArgsV3: {
  //       data: tokenMetadataV2,
  //       isMutable: true,
  //       collectionDetails: null,
  //     },
  //   }
  // ))

  // const newTokenTx2 = await sendAndConfirmTransaction(
  //   connection,
  //   mintTransaction,
  //   [payer, mintKeypair],
  //   undefined
  // );
  // console.log("New Token Created:", txUrl(newTokenTx2, network.cluster));
};

main();
