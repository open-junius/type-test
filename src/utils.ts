import { Account, createWalletClient, defineChain, http, publicActions, zeroAddress } from "viem"
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { blake2AsU8a, decodeAddress } from "@polkadot/util-crypto";
import { hexToU8a } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { MultiAddress } from '@polkadot-api/descriptors';
import { ss58Address } from "@polkadot-labs/hdkd-helpers";
export type ClientUrlType = 'http://localhost:9944';

export const chain = (id: number, url: string) => defineChain({
    id: id,
    name: 'bittenso',
    network: 'bittensor',
    nativeCurrency: {
        name: 'tao',
        symbol: 'TAO',
        decimals: 9,
    },
    rpcUrls: {
        default: {
            http: [url],
        },
    },
    testnet: true,
})

export async function getWalletClient(url: ClientUrlType, account: Account) {
    // require('dotenv').config();
    // const privateKey = process.env.PRIVATE_KEY;

    // if (!privateKey) {
    //     throw new Error("PRIVATE_KEY is not defined in the environment variables.");
    // }
    // privateKey = privateKey.replace('0x', '');

    // const account = privateKeyToAccount(`0x${privateKey}`)
    // console.log(`Wallet address ${account.address}`)


    const wallet = createWalletClient({
        account,
        transport: http(),
        chain: chain(42, url),
    })

    return wallet.extend(publicActions)
}

export function convertSs58ToMultiAddress(ss58Address: string) {
    const address = MultiAddress.Id(ss58Address)
    return address
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
export function generateRandomWallet() {
    let privateKey = generatePrivateKey().toString();
    privateKey = privateKey.replace('0x', '');

    const account = privateKeyToAccount(`0x${privateKey}`)

    return account
}