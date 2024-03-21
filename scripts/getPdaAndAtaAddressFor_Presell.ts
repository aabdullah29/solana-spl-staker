import { toPublicKey } from "@metaplex-foundation/js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { Connection, Keypair } from "@solana/web3.js";
import { getNetworkConfig } from "./spl/splHelper/helper";
import { networkName } from "./spl/splHelper/consts";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

(async () => {
  // [164,231,158,235,58,33,153,222,31,87,105,142,31,180,86,253,182,5,191,128,11,194,53,112,193,224,229,109,91,97,30,164,235,77,0,0,106,190,148,96,30,34,53,211,63,99,46,167,102,28,35,117,6,252,131,241,142,238,183,60,31,54,41,35]
  // ico program keypair

  const usdtMintAddress = toPublicKey("7zzcTCAHZizEkLGfJkj148TYfWfaRvs9JQn4gD75Y6gx"); // USDT
  const icoMintAddress = toPublicKey("FBKhAghAqzttng8UAAf7VuX7msiNAtVxgEsY4PrfZxP4"); // ICO
  const icoProgramAddress = toPublicKey("XhKfHXqkQF7ALsqyNTDK7EzZdzLidtyEa5S6dp9tXQW");
  const userPubkey = toPublicKey('C5jtiLaDBDoRL1dkag8gVEQ7xR9GtJ36wdL57xyfHzkF');

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
    [icoMintAddress.toBuffer()],
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


  const [dataProgramPDA, dataProgramPDABump] = findProgramAddressSync(
    [new Buffer("data"),userWallet.publicKey.toBuffer()],
    icoProgramAddress
  );
  console.log(
    "dataProgramPDA: ",
    dataProgramPDA.toString(),
    dataProgramPDABump
  );


  const usdtAtaForAdmin = await getOrCreateAssociatedTokenAccount(
    connection,
    userWallet,
    usdtMintAddress,
    userWallet.publicKey,
    false
  );


  const icoAtaForAdmin = await getOrCreateAssociatedTokenAccount(
    connection,
    userWallet,
    icoMintAddress,
    userWallet.publicKey,
    false
  );

  const usdtAtaForUser = await getOrCreateAssociatedTokenAccount(
    connection,
    userWallet,
    usdtMintAddress,
    userPubkey,
    false
  );

  const icoAtaForUser = await getOrCreateAssociatedTokenAccount(
    connection,
    userWallet,
    icoMintAddress,
    userPubkey,
    false
  );



  console.log(`\n\n
  createIcoATA --> (9600000000000, 100, 25)
  icoAtaForProgram: ${icoTokenStakeProgramPDA.toString()}
  dataPda: ${dataProgramPDA.toString()}
  icoMint: ${icoMintAddress.toString()}
  icoAtaForAdmin:  ${icoAtaForAdmin.address.toString()}
  admin: currentWallet
  `);

  console.log(`\n\n
  depositIcoInATA --> (25000000000000)
  icoAtaForProgram: ${icoTokenStakeProgramPDA.toString()}
  dataPda: ${dataProgramPDA.toString()}
  icoMint: ${icoMintAddress.toString()}
  icoAtaForAdmin:  ${icoAtaForAdmin.address.toString()}
  admin: ${userWallet.publicKey.toString()}
  `);

  console.log(`\n\n
  setData --> dataWithSol, dataWithUsdt
  dataPda: ${dataProgramPDA.toString()}
  admin: ${userWallet.publicKey.toString()}
  `);


  console.log(`\n
  buyWithSol --> (${icoTokenStakeProgramPDABump}, ${50})
  icoAtaForProgram: ${icoTokenStakeProgramPDA.toString()}
  dataPda: ${dataProgramPDA.toString()}
  icoMint: ${icoMintAddress.toString()}
  icoAtaForUser:  ${icoAtaForUser.address.toString()}
  user: ${userPubkey.toString()}
  admin: ${userWallet.publicKey.toString()}
  tokenProgram: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
  system_program: 11111111111111111111111111111111
  `);

  console.log(`\n
  buyWithUsdt --> (${icoTokenStakeProgramPDABump}, ${100})
  icoAtaForProgram: ${icoTokenStakeProgramPDA.toString()}
  dataPda: ${dataProgramPDA.toString()}
  icoMint: ${icoMintAddress.toString()}
  icoAtaForUser:  ${icoAtaForAdmin.address.toString()}
  usdtAtaForUser: ${usdtAtaForUser.address.toString()}
  usdtAtaForAdmin: ${usdtAtaForAdmin.address.toString()}
  user: ${userPubkey.toString()}
  tokenProgram: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
  `);
})();



