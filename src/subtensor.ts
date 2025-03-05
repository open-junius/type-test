import * as assert from "assert";
import { devnet, MultiAddress } from '@polkadot-api/descriptors';
import { createClient, PolkadotClient, TypedApi, Transaction, PolkadotSigner, Binary } from 'polkadot-api';
import {
    KeyPair,
    ss58Address,
} from "@polkadot-labs/hdkd-helpers"

import { getAliceSigner, waitForTransactionCompletion, getSignerFromKeypair } from './substrate'
import { convertH160ToSS58, convertPublicKeyToSs58 } from './address-utils'
import { tao } from './balance-math'

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

// force set balance for a ss58 address
export async function forceSetBalanceToSs58Address(api: TypedApi<typeof devnet>, ss58Address: string) {
    const alice = getAliceSigner()
    const balance = tao(1e6)
    const internalCall = api.tx.Balances.force_set_balance({ who: MultiAddress.Id(ss58Address), new_free: balance })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });

    const balanceOnChain = (await api.query.System.Account.getValue(ss58Address)).data.free
    // check the balance except for sudo account becasue of tx fee
    if (ss58Address !== convertPublicKeyToSs58(alice.publicKey)) {
        assert.equal(balance, balanceOnChain)
    }
}

// set balance for an eth address
export async function forceSetBalanceToEthAddress(api: TypedApi<typeof devnet>, ethAddress: string) {
    const ss58Address = convertH160ToSS58(ethAddress)
    await forceSetBalanceToSs58Address(api, ss58Address)
}

export async function setCommitRevealWeightsEnabled(api: TypedApi<typeof devnet>, netuid: number, enabled: boolean) {
    const value = await api.query.SubtensorModule.CommitRevealWeightsEnabled.getValue(netuid)
    if (value === enabled) {
        return;
    }

    const alice = getAliceSigner()
    const internalCall = api.tx.AdminUtils.sudo_set_commit_reveal_weights_enabled({ netuid: netuid, enabled: enabled })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });
    assert.equal(enabled, await api.query.SubtensorModule.CommitRevealWeightsEnabled.getValue(netuid))
}

export async function setWeightsSetRateLimit(api: TypedApi<typeof devnet>, netuid: number, rateLimit: bigint) {
    const value = await api.query.SubtensorModule.WeightsSetRateLimit.getValue(netuid)
    if (value === rateLimit) {
        return;
    }

    const alice = getAliceSigner()
    const internalCall = api.tx.AdminUtils.sudo_set_weights_set_rate_limit({ netuid: netuid, weights_set_rate_limit: rateLimit })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });
    assert.equal(rateLimit, await api.query.SubtensorModule.WeightsSetRateLimit.getValue(netuid))
}

// tempo is u16 in rust, but we just number in js. so value should be less than u16::Max
export async function setTempo(api: TypedApi<typeof devnet>, netuid: number, tempo: number) {
    const value = await api.query.SubtensorModule.Tempo.getValue(netuid)
    console.log("init avlue is ", value)
    if (value === tempo) {
        return;
    }

    const alice = getAliceSigner()
    const internalCall = api.tx.AdminUtils.sudo_set_tempo({ netuid: netuid, tempo: tempo })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });
    assert.equal(tempo, await api.query.SubtensorModule.Tempo.getValue(netuid))
}

export async function setCommitRevealWeightsInterval(api: TypedApi<typeof devnet>, netuid: number, interval: bigint) {
    const value = await api.query.SubtensorModule.RevealPeriodEpochs.getValue(netuid)
    if (value === interval) {
        return;
    }

    const alice = getAliceSigner()
    const internalCall = api.tx.AdminUtils.sudo_set_commit_reveal_weights_interval({ netuid: netuid, interval: interval })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });
    assert.equal(interval, await api.query.SubtensorModule.RevealPeriodEpochs.getValue(netuid))
}


export async function forceSetChainID(api: TypedApi<typeof devnet>, chainId: bigint) {
    const value = await api.query.EVMChainId.ChainId.getValue()
    if (value === chainId) {
        return;
    }

    const alice = getAliceSigner()
    const internalCall = api.tx.AdminUtils.sudo_set_evm_chain_id({ chain_id: chainId })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });
    assert.equal(chainId, await api.query.EVMChainId.ChainId.getValue())
}

export async function disableWhiteListCheck(api: TypedApi<typeof devnet>, disabled: boolean) {
    const value = await api.query.EVM.DisableWhitelistCheck.getValue()
    if (value === disabled) {
        return;
    }

    const alice = getAliceSigner()
    const internalCall = api.tx.EVM.disable_whitelist({ disabled: disabled })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });
    assert.equal(disabled, await api.query.EVM.DisableWhitelistCheck.getValue())
}

export async function burnedRegister(api: TypedApi<typeof devnet>, netuid: number, ss58Address: string, keypair: KeyPair) {
    const uids = await api.query.SubtensorModule.SubnetworkN.getValue(netuid)
    const signer = getSignerFromKeypair(keypair)
    const tx = api.tx.SubtensorModule.burned_register({ hotkey: ss58Address, netuid: netuid })
    await waitForTransactionCompletion(api, tx, signer)
        .then(() => { })
        .catch((error) => { console.log(`transaction error ${error}`) });
    assert.equal(uids + 1, await api.query.SubtensorModule.SubnetworkN.getValue(netuid))
}
