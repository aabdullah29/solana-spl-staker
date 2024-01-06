import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { toPublicKey } from "@metaplex-foundation/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { getMetaplexInstance, getNetworkConfig } from "../splHelper/helper";
import {
  getMintAddress,
  image,
  isMutable,
  name,
  networkName,
  newUpdateAuthority,
  royalty,
  symbol,
  verifySignerAsCreator,
} from "../splHelper/consts";
require("dotenv").config();

const secretKey: any = process.env.USER_WALLET;
const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));

(async () => {
  const MINT_ADDRESS = await getMintAddress(); //token address
  const network = getNetworkConfig(networkName);
  const connection = new Connection(network.cluster);
  const metaplex = getMetaplexInstance(network, connection, userWallet);

  const token = await metaplex.nfts().findByMint({
    mintAddress: new PublicKey(MINT_ADDRESS),
  });

  console.log(`Updating Metadata of Token: ${MINT_ADDRESS}`);
  // console.log("Token:", token);

  if (!token) {
    throw new Error("Unable to find existing token or image uri!");
  }

  // upload new metadata
  const { uri: newUri } = await metaplex.nfts().uploadMetadata({
    ...token.json,
    ...(name ? { name: name } : {}),
    ...(symbol ? { symbol: symbol } : {}),
    ...(image ? { image: image } : {}),
  });

  // onchain update
  const update = await metaplex.nfts().update({
    nftOrSft: token,
    isMutable: isMutable,
    authority: userWallet,
    ...(name ? { name: name } : {}),
    ...(symbol ? { symbol: symbol } : {}),
    ...(newUri ? { uri: newUri } : {}),
    // sellerFeeBasisPoints
    ...(royalty ? { sellerFeeBasisPoints: royalty } : {}),
    // creators
    ...(verifySignerAsCreator? {
        creators: [
          { address: userWallet.publicKey, share: 100, authority: userWallet },
        ],
      }: {}),
    // newUpdateAuthority
    ...(newUpdateAuthority &&
    newUpdateAuthority != userWallet.publicKey.toString()
      ? {
          newUpdateAuthority: toPublicKey(newUpdateAuthority),
        }
      : {}),
  });

  console.log(`New Metadata URI: ${newUri} 
  Tx Signature: ${update.response.signature}`);
})();
