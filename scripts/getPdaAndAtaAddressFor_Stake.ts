import { toPublicKey } from "@metaplex-foundation/js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { Connection, Keypair } from "@solana/web3.js";
import { getNetworkConfig } from "./spl/splHelper/helper";
import { networkName } from "./spl/splHelper/consts";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

(async () => {
  const rewardMintAddress = toPublicKey(
    "5yCiYccC6xiv7s4yPHo4ESgHjBsXh1ySuwZr9Z1oL5v7"
  ); // stake
  const mySplMintAddress = toPublicKey(
    "6oban7Xk5hk58NngWWyajhM9pQZej2akxUBSkAKwGJPF"
  ); // beef
  const stakeProgramAddress = toPublicKey(
    "E1XZtRdN7pSmzTr4f26WLATW2ifneyuWShZ9ZLV7d6Me"
  );

  const [rewardMintAuthorityPDA, rewardMintAuthorityPDABump] =
    findProgramAddressSync(
      [rewardMintAddress.toBuffer()],
      stakeProgramAddress
    );
  console.log(
    "rewardMintAuthorityPDA: ",
    rewardMintAuthorityPDA.toString(),
    rewardMintAuthorityPDABump
  );

  const [splTokenStakeProgramPDA, splTokenStakeProgramPDABump] =
  findProgramAddressSync(
      [mySplMintAddress.toBuffer()],
      stakeProgramAddress
    );
  console.log(
    "splTokenStakeProgramPDA: ",
    splTokenStakeProgramPDA.toString(),
    splTokenStakeProgramPDABump
  );

  const network = getNetworkConfig(networkName);
  const connection = new Connection(network.cluster);
  const secretKey: any = process.env.USER_WALLET;
  const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));

  const rewardAtaForUser = await getOrCreateAssociatedTokenAccount(
    connection,
    userWallet,
    rewardMintAddress,
    userWallet.publicKey,
    false
  );
  console.log("rewardAtaForUser: ", rewardAtaForUser.address.toString());

  const mysplAtaForUser = await getOrCreateAssociatedTokenAccount(
    connection,
    userWallet,
    mySplMintAddress,
    userWallet.publicKey,
    false
  );
  console.log("mysplAtaForUser: ", mysplAtaForUser.address.toString());



  console.log(`\n\n
  createMySplATA -->
  programMySplATA: ${splTokenStakeProgramPDA.toString()}
  mySplMint: ${mySplMintAddress.toString()}
  payer: currentWallet
  `)

  console.log(`\n
  stake --> (${rewardMintAuthorityPDABump}, ${splTokenStakeProgramPDABump}, ${55000000})
  tokenProgram: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
  rewardAtaForUser: ${rewardAtaForUser.address.toString()}
  authorityOfRewardMint: ${rewardMintAuthorityPDA.toString()}
  rewardMint: ${rewardMintAddress.toString()}, 
  mysplAtaForUser:  ${mysplAtaForUser.address.toString()}
  authorityOfmysplAtaForUser: currentWallet
  mysplAtaForProgram: ${splTokenStakeProgramPDA.toString()}
  mysplMint: ${mySplMintAddress.toString()}
  `)


  console.log(`\n
  unstake --> (${splTokenStakeProgramPDABump}, ${55000000})
  tokenProgram: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
  rewardAtaForUser: ${rewardAtaForUser.address.toString()}
  authorityOfRewardAtaForUser: currentWallet
  rewardMint: ${rewardMintAddress.toString()}, 
  mysplAtaForUser:  ${mysplAtaForUser.address.toString()}
  mysplAtaForProgram: ${splTokenStakeProgramPDA.toString()}
  mysplMint: ${mySplMintAddress.toString()}
  `)
})();

// createMySplATA
// programMySplATA: splTokenStakeProgramPDA,            //  BwiTCEp1w4WjvNJ5gXYki3tpwtHpBXbBw9Ea8JFkK5xa
// mySplMint: mySplMintAddress,                         //  6oban7Xk5hk58NngWWyajhM9pQZej2akxUBSkAKwGJPF
// payer: userWalletPublicKey,                          //  2vLR1s4cmXkYLutA8Xex7Mj1KmuxHw2ahL6GPXrJyEZN

// stake      (rewardMintAuthorityPDABump, splTokenStakeProgramPDABump, 1000000000)
// rewardAtaForUser: userATAForReward,                      // 8DWGTTGU4FnjvLJj9ZYZbVJmwRFVTb9ou6a2E9QNKpuA
// authorityOfRewardMint: rewardMintAuthorityPDA,           // 9JRmy6xqKFohtP5YPfdw5DEZCFPXwHBGrdpqsgwTdzxW
// rewardMint: rewardMintAddress,                           // 5yCiYccC6xiv7s4yPHo4ESgHjBsXh1ySuwZr9Z1oL5v7
// mysplAtaForuser: user.beefTokenBag,                     //  8YxrXzSfYdob1g1P2CPVFw5Epw5JEfQwVocH56htkzNw
// authorityOfmysplAtaForUser: user.wallet.publicKey,      //  2vLR1s4cmXkYLutA8Xex7Mj1KmuxHw2ahL6GPXrJyEZN
// mysplAtaForProgram: splTokenStakeProgramPDA,            //  BwiTCEp1w4WjvNJ5gXYki3tpwtHpBXbBw9Ea8JFkK5xa
// mysplMint: mySplMintAddress,                            //  6oban7Xk5hk58NngWWyajhM9pQZej2akxUBSkAKwGJPF


// unstake      (splTokenStakeProgramPDABump: u8, 55000000)
// rewardAtaForUser: 
// authorityOfRewardAtaForUser: currentWallet
// rewardMint: 
// mysplAtaForProgram: 
// mysplAtaForUser: 
// mysplAtaForUser: 