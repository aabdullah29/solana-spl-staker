import { getFileData, writeFileData } from "./helper";
import { toPublicKey } from "@metaplex-foundation/js";
require("dotenv").config();

export const decimals = 8;
export const totalSupply = 900000000000;
export const name = "Smart Token";
export const symbol = "ST";
export const image =
  "https://images.assetsdelivery.com/compings_v2/ahasoft2000/ahasoft20001802/ahasoft2000180204101.jpg";
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
  path: `scripts/spl/outputs/${name.replace(" ", "_")}.txt`,
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
  path: `scripts/spl/outputs/${name.replace(" ", "_")}.txt`,
  key: "MINT_KEYPAIR",
};
export const setMintKeypair = async (data: string) => {
  return writeFileData(mintKeypairConfig.path, mintKeypairConfig.key, data);
};
