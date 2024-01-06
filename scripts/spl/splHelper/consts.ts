import { getFileData, writeFileData } from "./helper";
import { toPublicKey } from "@metaplex-foundation/js";
require("dotenv").config();

export const decimals = 6;
export const totalSupply = 96000000000;
export const name = "REWARD";
export const symbol = "$RD";
export const image =
  "https://bafkreievpa5j5w7mpbny3gpzvwdckculahwnvzwpnaekns5dvrj7kma5ra.ipfs.nftstorage.link/";
export const royalty = 1000; // 100 = 1%
export const isMutable = false;
export const newUpdateAuthority = undefined;
export const mintAuthority = null;
export const freezeAuthority = null;
export const verifySignerAsCreator = true;

export const networkName = !!process.env.NETWORK
  ? process.env.NETWORK
  : "mainnet";

const mintAddressConfig = {
  path: `spl/outputs/${name.replace(" ", "_")}.txt`,
  key: "MINT_ADDRESS",
};
export const getMintAddress = async () => {
  return !!process.env.TOKEN_ADDRESS
    ? process.env.TOKEN_ADDRESS
    : getFileData(mintAddressConfig.path, mintAddressConfig.key);
};
export const setMintAddress = async (data: string) => {
  return writeFileData(mintAddressConfig.path, mintAddressConfig.key, data);
};

const mintKeypairConfig = {
  path: `outputs/${name.replace(" ", "_")}.txt`,
  key: "MINT_KEYPAIR",
};
export const setMintKeypair = async (data: string) => {
  return writeFileData(mintKeypairConfig.path, mintKeypairConfig.key, data);
};
