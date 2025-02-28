

import * as assert from "assert";
import * as chai from "chai";

import { getAliceSigner, getClient, getDevnetApi, waitForTransactionCompletion, convertPublicKeyToMultiAddress, getRandomSubstrateKeypair } from "../src/substrate"
import { generateRandomEthersWallet, getPublicClient, getWalletClient } from "../src/utils";
import { ETH_LOCAL_URL, SUB_LOCAL_URL } from "../src/config";
import { devnet, MultiAddress } from "@polkadot-api/descriptors"
import { getPolkadotSigner } from "polkadot-api/signer";
import { PublicClient, WalletClient, toBytes } from "viem";
import { PolkadotSigner, TypedApi, Binary, FixedSizeBinary } from "polkadot-api";
import { INCREMENTAL_CONTRACT_ABI, INCREMENTAL_CONTRACT_BYTECODE } from "../src/contracts/incremental";
import { convertH160ToSS58, toViemAddress } from "../src/address-utils";
import { ethers } from "ethers"

describe("bridge token contract deployment", () => {
    // init eth part
    const wallet = generateRandomEthersWallet();
    let publicClient: PublicClient;

    // init substrate part
    const keyPair = getRandomSubstrateKeypair();
    let api: TypedApi<typeof devnet>

    // sudo account alice as signer
    let alice: PolkadotSigner;

    before(async () => {
        publicClient = await getPublicClient(ETH_LOCAL_URL)
        const subClient = await getClient(SUB_LOCAL_URL)
        api = await getDevnetApi(subClient)
        alice = await getAliceSigner();

        // Alice funds fundedEthWallet
        const ss58Address = convertH160ToSS58(wallet.address)
        const internalCall = api.tx.Balances.force_set_balance({ who: MultiAddress.Id(ss58Address), new_free: BigInt(1e12) })
        const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

        await waitForTransactionCompletion(api, tx, alice)
            .then(() => { })
            .catch((error) => { console.log(`transaction error ${error}`) });

        const internalCall2 = api.tx.EVM.disable_whitelist({ disabled: true })
        const tx2 = api.tx.Sudo.sudo({ call: internalCall2.decodedCall })
        await waitForTransactionCompletion(api, tx2, alice)
            .then(() => { })
            .catch((error) => { console.log(`transaction error ${error}`) });
    });

    it("Can deploy bridge token smart contract", async () => {

        const contractFactory = new ethers.ContractFactory(INCREMENTAL_CONTRACT_ABI, INCREMENTAL_CONTRACT_BYTECODE, wallet)
        const contract = await contractFactory.deploy()
        await contract.waitForDeployment()

        const value = await publicClient.readContract({
            abi: INCREMENTAL_CONTRACT_ABI,
            address: toViemAddress(contract.target.toString()),
            functionName: "retrieve",
            args: []
        })
        assert.equal(value, 0)

        const newValue = 1234

        const deployContract = new ethers.Contract(contract.target.toString(), INCREMENTAL_CONTRACT_ABI, wallet)
        const storeTx = await deployContract.store(newValue)
        await storeTx.wait()

        const newValueAfterStore = await publicClient.readContract({
            abi: INCREMENTAL_CONTRACT_ABI,
            address: toViemAddress(contract.target.toString()),
            functionName: "retrieve",
            args: []
        })

        assert.equal(newValue, newValueAfterStore)
    });
});
