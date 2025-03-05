import * as assert from "assert";
import { getDevnetApi, getRandomSubstrateKeypair } from "../src/substrate"
import { devnet } from "@polkadot-api/descriptors"
import { PolkadotSigner, TypedApi } from "polkadot-api";
import { convertPublicKeyToSs58, convertH160ToSS58 } from "../src/address-utils"
import { raoToEth, tao } from "../src/balance-math"
import { ethers } from "ethers"
import { generateRandomEthersWallet } from "../src/utils"
import { convertH160ToPublicKey } from "../src/address-utils"
import {
    forceSetBalanceToEthAddress, forceSetBalanceToSs58Address, addNewSubnetwork, burnedRegister,
} from "../src/subtensor"

import { ISTAKING_ADDRESS, ISTAKING_V2_ADDRESS, IStakingABI, IStakingV2ABI } from "../src/contracts/staking"

describe("Test neuron precompile reveal weights", () => {
    // init eth part
    const wallet1 = generateRandomEthersWallet();
    const wallet2 = generateRandomEthersWallet();

    // init substrate part
    const hotkey = getRandomSubstrateKeypair();
    const coldkey = getRandomSubstrateKeypair();

    let api: TypedApi<typeof devnet>

    // sudo account alice as signer
    let alice: PolkadotSigner;
    before(async () => {
        // init variables got from await and async
        api = await getDevnetApi()
        // alice = await getAliceSigner();

        // await forceSetBalanceToSs58Address(api, convertPublicKeyToSs58(alice.publicKey))
        await forceSetBalanceToSs58Address(api, convertPublicKeyToSs58(hotkey.publicKey))
        await forceSetBalanceToSs58Address(api, convertPublicKeyToSs58(coldkey.publicKey))
        await forceSetBalanceToEthAddress(api, wallet1.address)
        await forceSetBalanceToEthAddress(api, wallet2.address)
        let netuid = await addNewSubnetwork(api, hotkey, coldkey)

        console.log("test the case on subnet ", netuid)

        await burnedRegister(api, netuid, convertH160ToSS58(wallet1.address), coldkey)
        await burnedRegister(api, netuid, convertH160ToSS58(wallet2.address), coldkey)
    })

    it("Can add stake", async () => {
        let netuid = (await api.query.SubtensorModule.TotalNetworks.getValue()) - 1
        let stakeBalance = raoToEth(tao(1))
        const stakeBefore = await api.query.SubtensorModule.Alpha.getValue(convertPublicKeyToSs58(hotkey.publicKey), convertH160ToSS58(wallet1.address), netuid)
        const contract = new ethers.Contract(ISTAKING_ADDRESS, IStakingABI, wallet1);
        const tx = await contract.addStake(hotkey.publicKey, netuid, { value: stakeBalance.toString() })
        await tx.wait()

        const stakeFromContract = BigInt(
            await contract.getStake(hotkey.publicKey, convertH160ToPublicKey(wallet1.address), netuid)
        );

        assert.ok(stakeFromContract > stakeBefore)
        const stakeAfter = await api.query.SubtensorModule.Alpha.getValue(convertPublicKeyToSs58(hotkey.publicKey), convertH160ToSS58(wallet1.address), netuid)
        assert.ok(stakeAfter > stakeBefore)
    })

    it("Can add stake V2", async () => {
        let netuid = (await api.query.SubtensorModule.TotalNetworks.getValue()) - 1
        let stakeBalance = raoToEth(tao(1))
        const stakeBefore = await api.query.SubtensorModule.Alpha.getValue(convertPublicKeyToSs58(hotkey.publicKey), convertH160ToSS58(wallet2.address), netuid)
        const contract = new ethers.Contract(ISTAKING_V2_ADDRESS, IStakingV2ABI, wallet2);
        const tx = await contract.addStake(hotkey.publicKey, stakeBalance.toString(), netuid)
        await tx.wait()

        const stakeFromContract = BigInt(
            await contract.getStake(hotkey.publicKey, convertH160ToPublicKey(wallet2.address), netuid)
        );

        assert.ok(stakeFromContract > stakeBefore)
        const stakeAfter = await api.query.SubtensorModule.Alpha.getValue(convertPublicKeyToSs58(hotkey.publicKey), convertH160ToSS58(wallet2.address), netuid)
        assert.ok(stakeAfter > stakeBefore)
    })

});