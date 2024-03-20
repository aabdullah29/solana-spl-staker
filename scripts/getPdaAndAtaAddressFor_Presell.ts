import { toPublicKey } from "@metaplex-foundation/js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { Connection, Keypair } from "@solana/web3.js";
import { getNetworkConfig } from "./spl/splHelper/helper";
import { networkName } from "./spl/splHelper/consts";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

(async () => {
  const usdtMintAddress = toPublicKey("5yCiYccC6xiv7s4yPHo4ESgHjBsXh1ySuwZr9Z1oL5v7"); // stake
  const icoSplMintAddress = toPublicKey("6oban7Xk5hk58NngWWyajhM9pQZej2akxUBSkAKwGJPF"); // beef
  const icoProgramAddress = toPublicKey("GqWug5qcoMMXguytUTWAsBAchhQk7byrtpaESaF1wT3Q");

  const [usdtMintAuthorityPDA, usdtMintAuthorityPDABump] = findProgramAddressSync(
    [usdtMintAddress.toBuffer()],
    icoProgramAddress
  );
  console.log(
    "usdtMintAuthorityPDA: ",
    usdtMintAuthorityPDA.toString(),
    usdtMintAuthorityPDABump
  );

  const [icoTokenStakeProgramPDA, icoTokenStakeProgramPDABump] = findProgramAddressSync(
    [icoSplMintAddress.toBuffer()],
    icoProgramAddress
  );
  console.log(
    "icoTokenStakeProgramPDA: ",
    icoTokenStakeProgramPDA.toString(),
    icoTokenStakeProgramPDABump
  );

  const network = getNetworkConfig(networkName);
  const connection = new Connection(network.cluster);
  const secretKey: any = process.env.USER_WALLET;
  const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
  console.log("wallet: ",userWallet.publicKey.toString());


  const [priceProgramPDA, priceProgramPDABump] = findProgramAddressSync(
    [new Buffer("price"),userWallet.publicKey.toBuffer()],
    icoProgramAddress
  );
  console.log(
    "priceProgramPDA: ",
    priceProgramPDA.toString(),
    priceProgramPDABump
  );


  const usdtAtaForAdmin = await getOrCreateAssociatedTokenAccount(
    connection,
    userWallet,
    usdtMintAddress,
    userWallet.publicKey,
    false
  );
  console.log("usdtAtaForAdmin: ", usdtAtaForAdmin.address.toString());

  const icoSplAtaForAdmin = await getOrCreateAssociatedTokenAccount(
    connection,
    userWallet,
    icoSplMintAddress,
    userWallet.publicKey,
    false
  );
  console.log("icoSplAtaForAdmin: ", icoSplAtaForAdmin.address.toString());

  console.log(`\n\n
  createMySplATA -->
  programMySplATA: ${icoTokenStakeProgramPDA.toString()}
  icoSplMint: ${icoSplMintAddress.toString()}
  icoSplAtaForAdmin:  ${icoSplAtaForAdmin.address.toString()}
  payer: currentWallet
  `);

  console.log(`\n\n
  depositIcoSplInATA -->
  programMySplATA: ${icoTokenStakeProgramPDA.toString()}
  icoSplMint: ${icoSplMintAddress.toString()}
  icoSplAtaForAdmin:  ${icoSplAtaForAdmin.address.toString()}
  admin: currentWallet
  `);

  console.log(`\n\n
  setPrice --> priceWithSol, priceWithUsdt
  pricePda: ${priceProgramPDA.toString()}
  admin: currentWallet
  `);


  console.log(`\n
  buyWithSol --> (${icoTokenStakeProgramPDABump}, ${55000000})
  user: currentWallet
  admin: currentWallet
  icoSplMint: ${icoSplMintAddress.toString()}
  icoSplAtaForUser:  ${icoSplAtaForAdmin.address.toString()}
  mysplAtaForProgram: ${icoTokenStakeProgramPDA.toString()}
  pricePda: ${priceProgramPDA.toString()}
  tokenProgram: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
  `);

  console.log(`\n
  buyWithUsdt --> (${icoTokenStakeProgramPDABump}, ${55000000})
  user: currentWallet
  usdtAtaForUser: ${usdtAtaForAdmin.address.toString()}
  usdtAtaForAdmin: ${usdtAtaForAdmin.address.toString()}
  icoSplMint: ${icoSplMintAddress.toString()}
  icoSplAtaForUser:  ${icoSplAtaForAdmin.address.toString()}
  mysplAtaForProgram: ${icoTokenStakeProgramPDA.toString()}
  pricePda: ${priceProgramPDA.toString()}
  tokenProgram: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
  `);
})();

// createMySplATA
// programMySplATA: icoTokenStakeProgramPDA,            //  BwiTCEp1w4WjvNJ5gXYki3tpwtHpBXbBw9Ea8JFkK5xa
// icoSplMint: icoSplMintAddress,                         //  6oban7Xk5hk58NngWWyajhM9pQZej2akxUBSkAKwGJPF
// payer: userWalletPublicKey,                          //  2vLR1s4cmXkYLutA8Xex7Mj1KmuxHw2ahL6GPXrJyEZN

// stake      (usdtMintAuthorityPDABump, icoTokenStakeProgramPDABump, 1000000000)
// usdtAtaForAdmin: userATAForReward,                      // 8DWGTTGU4FnjvLJj9ZYZbVJmwRFVTb9ou6a2E9QNKpuA
// rewardMint: usdtMintAddress,                           // 5yCiYccC6xiv7s4yPHo4ESgHjBsXh1ySuwZr9Z1oL5v7
// icoSplAtaForAdmin: user.beefTokenBag,                     //  8YxrXzSfYdob1g1P2CPVFw5Epw5JEfQwVocH56htkzNw
// authorityOficoSplAtaForAdmin: user.wallet.publicKey,      //  2vLR1s4cmXkYLutA8Xex7Mj1KmuxHw2ahL6GPXrJyEZN
// mysplAtaForProgram: icoTokenStakeProgramPDA,            //  BwiTCEp1w4WjvNJ5gXYki3tpwtHpBXbBw9Ea8JFkK5xa
// icoSplMint: icoSplMintAddress,                            //  6oban7Xk5hk58NngWWyajhM9pQZej2akxUBSkAKwGJPF

// unstake      (icoTokenStakeProgramPDABump: u8, 55000000)
// usdtAtaForAdmin:
// authorityOfusdtAtaForAdmin: currentWallet
// rewardMint:
// mysplAtaForProgram:
// icoSplAtaForAdmin:
// icoSplAtaForAdmin:
