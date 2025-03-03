import * as assert from "assert";
import * as chai from "chai";

import { getAliceSigner, getClient, getDevnetApi, waitForTransactionCompletion, convertPublicKeyToMultiAddress, getRandomSubstrateKeypair, getSignerFromKeypair } from "../src/substrate"
import { getPublicClient, } from "../src/utils";
import { ETH_LOCAL_URL, SUB_LOCAL_URL, } from "../src/config";
import { devnet, MultiAddress } from "@polkadot-api/descriptors"
import { PublicClient, walletActions } from "viem";
import { PolkadotSigner, TypedApi } from "polkadot-api";
import { toViemAddress, convertPublicKeyToSs58, convertH160ToSS58 } from "../src/address-utils"
import { decodeAddress } from "@polkadot/util-crypto";
import { Vec, Tuple, VecFixed, u16, u8, u64 } from "@polkadot/types-codec";
import { TypeRegistry } from "@polkadot/types";
import { ethers } from "ethers"
import { INEURON_ADDRESS, INeuronABI } from "../src/contracts/neuron"
import { generateRandomEthersWallet } from "../src/utils"
import { convertH160ToPublicKey } from "../src/address-utils"
import { blake2AsU8a } from "@polkadot/util-crypto";

function getCommitHash(netuid: number, address: string) {
    const registry = new TypeRegistry();
    const uids = [1];
    const values = [5];
    const salt = [9];
    const version_key = 0;

    let publicKey = convertH160ToPublicKey(address);
    console.log(publicKey);

    const tupleData = new Tuple(
        registry,
        [
            VecFixed.with(u8, 32),
            u16,
            Vec.with(u16),
            Vec.with(u16),
            Vec.with(u16),
            u64,
        ],
        [publicKey, netuid, uids, values, salt, version_key]
    );

    console.log("Encoded Array:", tupleData.toU8a());

    const hash = blake2AsU8a(tupleData.toU8a());
    console.log(hash);
    return hash;
}

describe("Test the EVM chain ID", () => {
    // init eth part
    const wallet = generateRandomEthersWallet();

    // init substrate part
    const hotkey = getRandomSubstrateKeypair();
    let publicClient: PublicClient;

    let api: TypedApi<typeof devnet>

    // sudo account alice as signer
    let alice: PolkadotSigner;

    before(async () => {
        // init variables got from await and async
        publicClient = await getPublicClient(ETH_LOCAL_URL)
        const subClient = await getClient(SUB_LOCAL_URL)
        api = await getDevnetApi(subClient)
        alice = await getAliceSigner();

        {
            const multiAddress = convertPublicKeyToMultiAddress(hotkey.publicKey)
            const internalCall = api.tx.Balances.force_set_balance({ who: multiAddress, new_free: BigInt(1e12) })
            const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

            await waitForTransactionCompletion(api, tx, alice)
                .then(() => { })
                .catch((error) => { console.log(`transaction error ${error}`) });
        }

        {
            const ss58Address = convertH160ToSS58(wallet.address)
            const internalCall = api.tx.Balances.force_set_balance({ who: MultiAddress.Id(ss58Address), new_free: BigInt(1e12) })
            const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

            await waitForTransactionCompletion(api, tx, alice)
                .then(() => { })
                .catch((error) => { console.log(`transaction error ${error}`) });
        }

        let totalNetworks = await api.query.SubtensorModule.TotalNetworks.getValue()
        assert.ok(totalNetworks > 1)
        const subnetId = totalNetworks - 1

        let uid_count =
            await api.query.SubtensorModule.SubnetworkN.getValue(subnetId)
        if (uid_count === 0) {
            const tx = api.tx.SubtensorModule.burned_register({ hotkey: convertPublicKeyToSs58(hotkey.publicKey), netuid: subnetId })
            await waitForTransactionCompletion(api, tx, alice)
                .then(() => { })
                .catch((error) => { console.log(`transaction error ${error}`) });
        }
    })

    it("Burned register and check emission", async () => {
        let totalNetworks = await api.query.SubtensorModule.TotalNetworks.getValue()
        const subnetId = totalNetworks - 1
        const uid = await api.query.SubtensorModule.SubnetworkN.getValue(subnetId)
        const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, wallet);

        const tx = await contract.burnedRegister(
            subnetId,
            hotkey.publicKey
        );
        await tx.wait();

        const uidAfterNew = await api.query.SubtensorModule.SubnetworkN.getValue(subnetId)
        assert.equal(uid + 1, uidAfterNew)

        const key = await api.query.SubtensorModule.Keys.getValue(subnetId, uid)
        assert.equal(key, convertPublicKeyToSs58(hotkey.publicKey))

        let i = 0;
        while (i < 10) {
            const emission = await api.query.SubtensorModule.PendingEmission.getValue(subnetId)

            console.log("emission is ", emission);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            assert.ok(emission > BigInt(0))
            i += 1;
        }
    })
});