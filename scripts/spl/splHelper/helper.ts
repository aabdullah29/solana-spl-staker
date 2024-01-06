import { Keypair, Connection, clusterApiUrl } from "@solana/web3.js";
import { readFile, writeFile, access } from "fs/promises";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  UploadMetadataInput,
} from "@metaplex-foundation/js";
require("dotenv").config();

// network config
export const getNetworkConfig = (network: string) => {
  if (network === "mainnet") {
    return {
      cluster: clusterApiUrl("mainnet-beta"),
      address: "https://node1.bundlr.network",
      providerUrl: "https://api.mainnet-beta.solana.com",
    };
  } else if (network === "devnet") {
    return {
      cluster: clusterApiUrl("devnet"),
      address: "https://devnet.bundlr.network",
      providerUrl: "https://api.devnet.solana.com",
    };
  } else {
    throw Error("Network is not valid.");
  }
};

// metaplex
export const getMetaplexInstance = (
  network: any,
  connection: Connection,
  wallet: Keypair
) => {
  return Metaplex.make(connection)
    .use(keypairIdentity(wallet))
    .use(
      bundlrStorage({
        address: network.address,
        providerUrl: network.providerUrl,
        timeout: 60000,
      })
    );
};

// upload metadata on arwave function
export const uploadMetadata = async (
  metaplex: Metaplex,
  tokenMetadata: UploadMetadataInput
): Promise<string> => {
  const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
  return uri;
};

export const txUrl = (txId: string) => {
  return `Transaction: https://explorer.solana.com/tx/${txId}?cluster=${"devnet"}`;
};


export const getFileData = async (path: string, key: string) => {
  let mintAddress = "";
  // const path = "spl/outputs/mintAddress.txt";
  // const key = "MINT_ADDRESS";
  try {
    const data: string = await readFile(path, "utf-8");
    if (data.includes(key)) {
      try {
        const json = JSON.parse(data);
        mintAddress = json[key];
      } catch (error) {
        console.error("Error parsing JSON: ", error);
        throw Error("JSON_Parse.");
      }
    } else {
      throw Error(`key "${key}"" not found.`);
    }
  } catch (error) {
    console.error("Error reading file:", error);
    throw Error("getMintAddress.");
  }

  return mintAddress;
};

export const writeFileData = async (
  path: string,
  key: string,
  data: string
) => {
  // const path = "spl/outputs/mintAddress.txt";
  // const key = "MINT_ADDRESS";
  // const data = "addresssssss"
  try {
    let jsonData;
    // Check if the file exists
    const fileExists = await access(path)
      .then(() => true)
      .catch(() => false);

    if (fileExists) {
      // Use 'a' flag for append if the file exists, and 'w' flag for write if it doesn't
      // const flag = fileExists ? "a" : "w";
      const existingData = await readFile(path, "utf-8");
      jsonData = JSON.parse(existingData || existingData.length >=2 ? existingData : "{}");
      jsonData[key] = data;
    }

    // Write data to the file
    await writeFile(path, JSON.stringify(jsonData, null, 2) ?? `{"${key}":"${data}"}`, {
      /*flag,*/ encoding: "utf-8",
    });
    console.log(path, "<= success!");
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
};

