import * as assert from "assert";
import * as chai from "chai";

import { getAliceSigner, getClient, getDevnetApi, waitForTransactionCompletion, convertPublicKeyToMultiAddress, getRandomSubstrateSigner } from "../src/substrate"
import { generateRandomEthWallet, getPublicClient, getTestClient, getWalletClient, } from "../src/utils";
import { ETH_LOCAL_URL, SUB_LOCAL_URL } from "../src/config";
import { devnet, MultiAddress } from "@polkadot-api/descriptors"
import { getPolkadotSigner } from "polkadot-api/signer";
import { PublicClient, WalletClient, toBytes } from "viem";
import { PolkadotSigner, TypedApi, Binary, FixedSizeBinary } from "polkadot-api";
import { wagmiContract } from "../src/bridgeToken";
import { convertH160ToSS58, generateRandomEthersWallet } from "../src/utils";
import { tao, raoToEth } from "../src/balance-math";
import { toViemAddress } from "../src/address-utils"
import { ethers } from "ethers"
import { estimateTransactionCost } from "../src/eth"
describe("Balance transfers between substrate and EVM", () => {
    // init eth part
    const wallet = generateRandomEthersWallet();
    const wallet2 = generateRandomEthersWallet();
    let ethClient: WalletClient;
    let publicClient: PublicClient;
    const provider = new ethers.JsonRpcProvider(ETH_LOCAL_URL);
    // init substrate part
    const signer = getRandomSubstrateSigner();
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
        const internalCall = api.tx.Balances.force_set_balance({ who: MultiAddress.Id(ss58Address), new_free: tao(123) })
        const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

        await waitForTransactionCompletion(api, tx, alice)
            .then(() => { })
            .catch((error) => { console.log(`transaction error ${error}`) });

        const ss58Address2 = convertH160ToSS58(wallet2.address)
        const internalCall2 = api.tx.Balances.force_set_balance({ who: MultiAddress.Id(ss58Address2), new_free: tao(123) })
        const tx2 = api.tx.Sudo.sudo({ call: internalCall2.decodedCall })

        await waitForTransactionCompletion(api, tx2, alice)
            .then(() => { })
            .catch((error) => { console.log(`transaction error ${error}`) });

        const multiAddress = convertPublicKeyToMultiAddress(signer.publicKey)
        const internalCall3 = api.tx.Balances.force_set_balance({ who: multiAddress, new_free: tao(123) })
        const tx3 = api.tx.Sudo.sudo({ call: internalCall3.decodedCall })

        await waitForTransactionCompletion(api, tx3, alice)
            .then(() => { })
            .catch((error) => { console.log(`transaction error ${error}`) });

        const a = await provider.getBalance(wallet.address)
        const b = await provider.getBalance(wallet2.address)

        console.log("a and b", a, b)

    });

    it("Can transfer token from EVM to EVM", async () => {
        const senderBalance = await publicClient.getBalance({ address: toViemAddress(wallet.address) })
        const receiverBalance = await publicClient.getBalance({ address: toViemAddress(wallet2.address) })
        const transferBalance = raoToEth(tao(1))


        const tx = {
            to: wallet2.address,
            value: transferBalance.toString()
        }
        const txFee = await estimateTransactionCost(provider, tx)

        const txResponse = await wallet.sendTransaction(tx)
        await txResponse.wait();


        const senderBalanceAfterTransfer = await publicClient.getBalance({ address: toViemAddress(wallet.address) })
        const receiverBalanceAfterTranser = await publicClient.getBalance({ address: toViemAddress(wallet2.address) })

        assert.equal(senderBalanceAfterTransfer, senderBalance - transferBalance - txFee)
        assert.equal(receiverBalance, receiverBalanceAfterTranser - transferBalance)

    });
});
