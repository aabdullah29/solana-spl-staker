import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { getNetworkConfig } from "../splHelper/helper";
import {
  Connection,
  Keypair,
  ParsedAccountData,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getMintAddress, networkName } from "../splHelper/consts";
import { PublicKey, toPublicKey } from "@metaplex-foundation/js";
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

const toAddress = toPublicKey("");
const amount = 100;

async function getNumberDecimals(
  connection: Connection,
  mintAddress: PublicKey
): Promise<number> {
  const info = await connection.getParsedAccountInfo(mintAddress);
  const result = (info.value?.data as ParsedAccountData).parsed.info
    .decimals as number;
  return result;
}

(async () => {
  const secretKey: any = process.env.USER_WALLET;
  const fromUserWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
  console.log("userWallet address: ", fromUserWallet.publicKey.toString());

  const network = getNetworkConfig(networkName);
  const connection = new Connection(network.cluster);
  const mintAddress = toPublicKey(await getMintAddress());

  //Step 1
  let fromAtaAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromUserWallet,
    mintAddress,
    fromUserWallet.publicKey
  );
  console.log(` Source Account: ${fromAtaAccount.address.toString()}`);

  //Step 2
  let toAtaAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromUserWallet,
    mintAddress,
    toAddress
  );
  console.log(` Destination Account: ${toAtaAccount.address.toString()}`);

  //Step 3
  const numberDecimals = await getNumberDecimals(connection, mintAddress);
  console.log(` Number of Decimals: ${numberDecimals}`);

  //Step 4
  console.log(`4 - Creating and Sending Transaction`);
  const tx = new Transaction();
  tx.add(
    createTransferInstruction(
      toAtaAccount.address,
      fromAtaAccount.address,
      fromUserWallet.publicKey,
      amount * Math.pow(10, numberDecimals)
    )
  );

  const latestBlockHash = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latestBlockHash.blockhash;
  const signature = await sendAndConfirmTransaction(connection, tx, [
    fromUserWallet,
  ]);
  console.log(signature);
})();
