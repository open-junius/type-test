import { devnet, MultiAddress } from '@polkadot-api/descriptors';
import { createClient, PolkadotClient, TypedApi, Transaction, PolkadotSigner, Binary } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import {
    sr25519,
    DEV_PHRASE,
    entropyToMiniSecret,
    mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers"

import { getPolkadotSigner } from "polkadot-api/signer"
import { randomBytes } from 'crypto';
import { Keyring } from '@polkadot/keyring';

// define url string as type to extend in the future
// export type ClientUrlType = 'ws://localhost:9944' | 'wss://test.finney.opentensor.ai:443' | 'wss://dev.chain.opentensor.ai:443' | 'wss://archive.chain.opentensor.ai';
export type ClientUrlType = 'ws://localhost:9944'


export async function getClient(url: ClientUrlType) {
    const provider = getWsProvider(url);
    const client = createClient(provider);
    return client
}

export async function getDevnetApi(client: PolkadotClient) {
    let api = client.getTypedApi(devnet)
    return api
}

export function getAlice() {
    const entropy = mnemonicToEntropy(DEV_PHRASE)
    const miniSecret = entropyToMiniSecret(entropy)
    const derive = sr25519CreateDerive(miniSecret)
    const hdkdKeyPair = derive("//Alice")

    return hdkdKeyPair
}

export function getAliceSigner() {
    const alice = getAlice()
    const polkadotSigner = getPolkadotSigner(
        alice.publicKey,
        "Sr25519",
        alice.sign,
    )

    return polkadotSigner
}

export function getRandomKeypair() {
    const seed = randomBytes(32);
    const miniSecret = entropyToMiniSecret(seed)
    const derive = sr25519CreateDerive(miniSecret)
    const hdkdKeyPair = derive("")

    return hdkdKeyPair
}

export async function getBalance(api: TypedApi<typeof devnet>) {
    const value = await api.query.Balances.Account.getValue("")
    return value
}

export function convertPublicKeyToMultiAddress(publicKey: Uint8Array, ss58Format: number = 42): MultiAddress {
    // Create a keyring instance
    const keyring = new Keyring({ type: 'sr25519', ss58Format });

    // Add the public key to the keyring
    const address = keyring.encodeAddress(publicKey);

    return MultiAddress.Id(address);
}

export async function waitForTransactionCompletion(tx: Transaction<{}, string, string, void>, signer: PolkadotSigner,) {
    return new Promise<void>((resolve, reject) => {
        const subscription = tx.signSubmitAndWatch(signer).subscribe({
            next(value) {
                console.log("Event:", value);

                if (value.type === "txBestBlocksState") {
                    console.log("Transaction is finalized in block:", value.txHash);
                    subscription.unsubscribe();
                    // Resolve the promise when the transaction is finalized
                    resolve();

                }
            },
            error(err) {
                console.error("Transaction failed:", err);
                subscription.unsubscribe();
                // Reject the promise in case of an error
                reject(err);

            },
            complete() {
                console.log("Subscription complete");
            }
        });
    });
}

// second solution to wait for transaction finalization. pass the raw data to avoid the complex transaction type definition
export async function waitForTransactionCompletion2(api: TypedApi<typeof devnet>, raw: Binary, signer: PolkadotSigner,) {
    const tx = await api.txFromCallData(raw);
    return new Promise<void>((resolve, reject) => {
        const subscription = tx.signSubmitAndWatch(signer).subscribe({
            next(value) {
                console.log("Event:", value);

                if (value.type === "txBestBlocksState") {
                    console.log("Transaction is finalized in block:", value.txHash);
                    subscription.unsubscribe();
                    // Resolve the promise when the transaction is finalized
                    resolve();

                }
            },
            error(err) {
                console.error("Transaction failed:", err);
                subscription.unsubscribe();
                // Reject the promise in case of an error
                reject(err);

            },
            complete() {
                console.log("Subscription complete");
            }
        });
    });
}