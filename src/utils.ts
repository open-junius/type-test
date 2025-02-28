import { Account, createWalletClient, defineChain, http, publicActions, createPublicClient, createClient, walletActions, createTestClient } from "viem"
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { blake2AsU8a, decodeAddress } from "@polkadot/util-crypto";
import { hexToU8a } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { MultiAddress } from '@polkadot-api/descriptors';
import { ss58Address, KeyPair } from "@polkadot-labs/hdkd-helpers";

import { mainnet, moonriver } from 'viem/chains'
import { ethers } from "ethers"
import { ETH_LOCAL_URL } from "./config"

export type ClientUrlType = 'http://localhost:9944';

export const chain = (id: number, url: string) => defineChain({
    id: id,
    name: 'bittensor',
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

export async function getTestClient(url: ClientUrlType, account: Account) {
    // require('dotenv').config();
    // const privateKey = process.env.PRIVATE_KEY;

    // if (!privateKey) {
    //     throw new Error("PRIVATE_KEY is not defined in the environment variables.");
    // }
    // privateKey = privateKey.replace('0x', '');

    // const account = privateKeyToAccount(`0x${privateKey}`)
    // console.log(`Wallet address ${account.address}`)


    const wallet = createTestClient({
        // account,
        mode: 'anvil',
        chain: chain(0, url),
        transport: http(url),
    })

    return wallet.extend(publicActions).extend(walletActions)
}

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
        transport: http(url),
        chain: chain(42, url),
    })

    return wallet.extend(publicActions)
}

export async function getPublicClient(url: ClientUrlType) {
    // require('dotenv').config();
    // const privateKey = process.env.PRIVATE_KEY;

    // if (!privateKey) {
    //     throw new Error("PRIVATE_KEY is not defined in the environment variables.");
    // }
    // privateKey = privateKey.replace('0x', '');

    // const account = privateKeyToAccount(`0x${privateKey}`)
    // console.log(`Wallet address ${account.address}`)


    const wallet = createPublicClient({
        chain: chain(42, url),
        transport: http(),

    })

    return wallet.extend(publicActions)
}

/**
 * Generates a random Ethereum wallet
 * @returns wallet keyring
 */
export function generateRandomEthWallet() {
    let privateKey = generatePrivateKey().toString();
    privateKey = privateKey.replace('0x', '');

    const account = privateKeyToAccount(`0x${privateKey}`)
    return account
}


export function generateRandomEthersWallet() {
    const account = ethers.Wallet.createRandom();
    const provider = new ethers.JsonRpcProvider(ETH_LOCAL_URL);

    const wallet = new ethers.Wallet(account.privateKey, provider);
    return wallet;
}