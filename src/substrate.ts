import { localnet, testnet, devnet, mainnet } from '@polkadot-api/descriptors';
import { createClient, TypedApi } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import {
    sr25519,
    DEV_PHRASE,
    entropyToMiniSecret,
    mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers"
import { env } from 'bun';


export type ClientUrlType = 'ws://localhost:9944' | 'wss://test.finney.opentensor.ai:443' | 'wss://dev.chain.opentensor.ai:443' | 'wss://archive.chain.opentensor.ai';

export async function getApi(url: ClientUrlType) {
    const provider = getWsProvider(url);
    const client = createClient(provider);
    let dotApi;
    switch (url) {
        case 'ws://localhost:9944': dotApi = client.getTypedApi(localnet)
        case 'wss://test.finney.opentensor.ai:443': dotApi = client.getTypedApi(testnet)
        case 'wss://dev.chain.opentensor.ai:443': dotApi = client.getTypedApi(devnet)
        case 'wss://archive.chain.opentensor.ai': dotApi = client.getTypedApi(mainnet)
    }

    return dotApi
}

export async function getBalance() {
    const api = await getApi('ws://localhost:9944')
    const account = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
    const balance = (await api.query.Balances.Account.getValue(account)).free;
    console.log("balance is: ", balance.toString());
}

export function getKeyPair() {
    require('dotenv').config();
    const phrase = process.env.URI;
    if (!phrase) {
        throw new Error("PRIVATE_KEY is not defined in the environment variables.");
    }
    const entropy = mnemonicToEntropy(phrase)
    const miniSecret = entropyToMiniSecret(entropy)
    const derive = sr25519CreateDerive(miniSecret)

    // Example usage for generating a sr25519 keypair with hard derivation
    const keypair = derive("//Alice")
    return keypair
}
