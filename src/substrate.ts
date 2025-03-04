import * as assert from "assert";
import { devnet, MultiAddress } from '@polkadot-api/descriptors';
import { createClient, PolkadotClient, TypedApi, Transaction, PolkadotSigner, Binary } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import {
    sr25519,
    DEV_PHRASE,
    entropyToMiniSecret,
    mnemonicToEntropy,
    ss58Address,
    KeyPair,
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

// create a new subnet and return netuid 
export async function addNewSubnetwork(api: TypedApi<typeof devnet>, hotkey: KeyPair, coldkey: KeyPair) {
    const alice = getAliceSigner()
    const totalNetworks = await api.query.SubtensorModule.TotalNetworks.getValue()

    const rateLimit = await api.query.SubtensorModule.NetworkRateLimit.getValue()
    if (rateLimit !== BigInt(0)) {
        const internalCall = api.tx.AdminUtils.sudo_set_network_rate_limit({ rate_limit: BigInt(0) })
        const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })
        await waitForTransactionCompletion(api, tx, alice)
            .then(() => { })
            .catch((error) => { console.log(`transaction error ${error}`) });
    }

    const signer = getSignerFromKeypair(coldkey)
    const registerNetworkTx = api.tx.SubtensorModule.register_network({ hotkey: convertPublicKeyToSs58(hotkey.publicKey) })
    await waitForTransactionCompletion(api, registerNetworkTx, signer)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });

    assert.equal(totalNetworks + 1, await api.query.SubtensorModule.TotalNetworks.getValue())
    return totalNetworks
}

export function getRandomSubstrateSigner() {
    const keypair = getRandomSubstrateKeypair();
    return getSignerFromKeypair(keypair)
}

export function getSignerFromKeypair(keypair: KeyPair) {
    const polkadotSigner = getPolkadotSigner(
        keypair.publicKey,
        "Sr25519",
        keypair.sign,
    )
    return polkadotSigner
}

export function getRandomSubstrateKeypair() {
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

export async function getNonce(api: TypedApi<typeof devnet>, ss58Address: string): Promise<number> {
    const value = await api.query.System.Account.getValue(ss58Address);
    return value.nonce
}

export async function getNonceChangePromise(api: TypedApi<typeof devnet>, ss58Address: string) {
    // api.query.System.Account.getValue()
    const initValue = await api.query.System.Account.getValue(ss58Address);
    return new Promise<void>((resolve, reject) => {
        const subscription = api.query.System.Account.watchValue(ss58Address).subscribe({
            next(value) {
                if (value.nonce > initValue.nonce) {
                    subscription.unsubscribe();
                    // Resolve the promise when the transaction is finalized
                    resolve();
                }
            },

            error(err: Error) {
                console.error("Transaction failed:", err);
                subscription.unsubscribe();
                // Reject the promise in case of an error
                reject(err);
            },
            complete() {
                console.log("Subscription complete");
            }
        })

        setTimeout(() => {
            subscription.unsubscribe();
            console.log('unsubscribed!');
            resolve()
        }, 2000);

    })
}

export function convertPublicKeyToSs58(publicKey: Uint8Array, ss58Format: number = 42): string {
    // Create a keyring instance
    const keyring = new Keyring({ type: 'sr25519', ss58Format });

    // Add the public key to the keyring
    const address = keyring.encodeAddress(publicKey);

    return address
}

export function convertPublicKeyToMultiAddress(publicKey: Uint8Array, ss58Format: number = 42): MultiAddress {
    // Create a keyring instance
    const keyring = new Keyring({ type: 'sr25519', ss58Format });

    // Add the public key to the keyring
    const address = keyring.encodeAddress(publicKey);

    return MultiAddress.Id(address);
}

export async function waitForTransactionCompletion(api: TypedApi<typeof devnet>, tx: Transaction<{}, string, string, void>, signer: PolkadotSigner,) {
    const transactionPromise = await getTransactionWatchPromise(tx, signer)
    const ss58Address = convertPublicKeyToSs58(signer.publicKey)
    const noncePromise = await getNonceChangePromise(api, ss58Address)

    return new Promise<void>((resolve, reject) => {
        Promise.race([transactionPromise, noncePromise])
            .then(resolve)
            .catch(reject);
    })
}

export async function getTransactionWatchPromise(tx: Transaction<{}, string, string, void>, signer: PolkadotSigner,) {
    return new Promise<void>((resolve, reject) => {
        const subscription = tx.signSubmitAndWatch(signer).subscribe({
            next(value) {
                console.log("Event:", value);

                // TODO investigate why finalized not for each extrinsic
                if (value.type === "finalized") {
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

        setTimeout(() => {
            subscription.unsubscribe();
            console.log('unsubscribed!');
            resolve()
        }, 2000);
    });
}

export async function waitForFinalizedBlock(api: TypedApi<typeof devnet>) {
    const currentBlockNumber = await api.query.System.Number.getValue()
    return new Promise<void>((resolve, reject) => {

        const subscription = api.query.System.Number.watchValue().subscribe({
            // TODO check why the block number event just get once
            next(value: number) {
                console.log("Event block number is :", value);

                if (value > currentBlockNumber + 6) {
                    console.log("Transaction is finalized in block:", value);
                    subscription.unsubscribe();

                    resolve();

                }

            },
            error(err: Error) {
                console.error("Transaction failed:", err);
                subscription.unsubscribe();
                // Reject the promise in case of an error
                reject(err);

            },
            complete() {
                console.log("Subscription complete");
            }
        });

        setTimeout(() => {
            subscription.unsubscribe();
            console.log('unsubscribed!');
            resolve()
        }, 2000);
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
            error(err: Error) {
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

export async function waitForNonceChange(api: TypedApi<typeof devnet>, ss58Address: string) {
    const initNonce = await getNonce(api, ss58Address)
    while (true) {
        const currentNonce = await getNonce(api, ss58Address)
        if (currentNonce > initNonce) {
            break
        }

        await new Promise(resolve => setTimeout(resolve, 200));
    }
}