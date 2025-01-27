import { createWalletClient, defineChain, http, publicActions, zeroAddress } from "viem"
import { privateKeyToAccount } from 'viem/accounts'
import { blake2AsU8a, decodeAddress } from "@polkadot/util-crypto";
import { hexToU8a } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { ethers } from "ethers";

export type ClientUrlType = 'http://localhost:9944' | 'https://dev.chain.opentensor.ai';

export const chain = defineChain({
    id: 947,
    name: 'bittenso',
    network: 'bittensor',
    nativeCurrency: {
        name: 'tao',
        symbol: 'TAO',
        decimals: 9,
    },
    rpcUrls: {
        default: {
            http: ['http://localhost:9944'],
        },
    },
    testnet: true,
})

export async function getWalletClient(url: ClientUrlType) {
    require('dotenv').config();
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY is not defined in the environment variables.");
    }

    const account = privateKeyToAccount(`0x${privateKey}`)
    console.log(`Wallet address ${account.address}`)


    const wallet = createWalletClient({
        account,
        transport: http(),
        chain,
    })

    return wallet.extend(publicActions)
}

export function convertH160ToSS58(ethAddress: string) {
    // get the public key
    const hash = convertH160ToPublicKey(ethAddress);

    // Convert the hash to SS58 format
    const ss58Address = encodeAddress(hash, 42); // Assuming network ID 42
    return ss58Address;
}

export function convertH160ToPublicKey(ethAddress: string) {
    const prefix = "evm:";
    const prefixBytes = new TextEncoder().encode(prefix);
    const addressBytes = hexToU8a(
        ethAddress.startsWith("0x") ? ethAddress : `0x${ethAddress}`
    );
    const combined = new Uint8Array(prefixBytes.length + addressBytes.length);

    // Concatenate prefix and Ethereum address
    combined.set(prefixBytes);
    combined.set(addressBytes, prefixBytes.length);

    // Hash the combined data (the public key)
    const hash = blake2AsU8a(combined);
    return hash;
}

export function ss58ToH160(ss58Address: string) {
    // Decode the SS58 address to a Uint8Array public key
    const publicKey = decodeAddress(ss58Address);

    // Take the first 20 bytes of the hashed public key for the Ethereum address
    const ethereumAddressBytes = publicKey.slice(0, 20);

    // Convert the 20 bytes into an Ethereum H160 address format (Hex string)
    const ethereumAddress = '0x' + Buffer.from(ethereumAddressBytes).toString('hex');

    return ethereumAddress;
}

/**
 * Generates a random Ethereum wallet
 * @returns wallet keyring
 */
export function generateRandomAddress() {
    const wallet = ethers.Wallet.createRandom();
    return wallet;
}