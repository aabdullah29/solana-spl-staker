import {
  Keypair,
  Connection,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import {
  toPublicKey,
} from "@metaplex-foundation/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {
  getNetworkConfig,
} from "../splHelper/helper";
import {
  freezeAuthority,
  getMintAddress,
  networkName,
} from "../splHelper/consts";
require("dotenv").config();

/* 
 main function
*/
const main = async () => {
  const secretKey: any = process.env.USER_WALLET;
  const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
  console.log("userWallet address: ", userWallet.publicKey.toString());
  const MINT_ADDRESS = await getMintAddress(); //token address
  const network = getNetworkConfig(networkName);
  const connection = new Connection(network.cluster);

  let authorityTransaction = new Transaction().add(
    createSetAuthorityInstruction(
      toPublicKey(MINT_ADDRESS), // mint acocunt || token account
      userWallet.publicKey, // current auth
      AuthorityType.FreezeAccount, // authority type
      null // new auth (you can pass `null` to close it or PubKey)
    )
  );

  console.log(`Updating Authority of Token: ${MINT_ADDRESS}`);
  
  const transactionId = await sendAndConfirmTransaction(
    connection,
    authorityTransaction,
    [userWallet]
  );

  console.log(`transaction Hash`, transactionId);
};

main();
