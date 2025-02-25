

import * as assert from "assert";
import * as chai from "chai";

import { getAliceSigner, getClient, getDevnetApi, waitForTransactionCompletion, convertPublicKeyToMultiAddress, getRandomSubstrateKeypair } from "../src/substrate"
import { generateRandomEthWallet, getPublicClient, getWalletClient } from "../src/utils";
import { ETH_LOCAL_URL, SUB_LOCAL_URL } from "../src/config";
import { devnet, MultiAddress } from "@polkadot-api/descriptors"
import { getPolkadotSigner } from "polkadot-api/signer";
import { PublicClient, WalletClient, toBytes } from "viem";
import { PolkadotSigner, TypedApi, Binary, FixedSizeBinary } from "polkadot-api";
import { wagmiContract } from "../src/bridgeToken";
import { convertH160ToSS58 } from "../src/utils";

describe("bridge token contract deployment", () => {
    // init eth part
    const wallet = generateRandomEthWallet();
    let ethClient: WalletClient;
    let publicClient: PublicClient;

    // init substrate part
    const keyPair = getRandomSubstrateKeypair();
    let api: TypedApi<typeof devnet>

    // sudo account alice as signer
    let alice: PolkadotSigner;

    before(async () => {
        // init variables got from await and async
        ethClient = await getWalletClient(ETH_LOCAL_URL, wallet);
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

        const balance = await publicClient.getBalance({ address: wallet.address })
        console.log("after balance is ", balance)

    });

    it("Can deploy bridge token smart contract", async () => {
        // const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
        // await usingApi(async (api) => {
        // Alice gives permission to signer to create a contract
        const member: FixedSizeBinary<20> = new FixedSizeBinary(toBytes(wallet.address))
        const internalCall = api.tx.EVM.set_whitelist({ new: [member] })
        const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall });

        await waitForTransactionCompletion(api, tx, alice)
            .then(() => { })
            .catch((error) => { console.log(`transaction error ${error}`) });

        const toAddress = ethClient.account?.address;
        if (!toAddress) {
            throw new Error("Wallet address is undefined");
        }

        let hash = await ethClient.deployContract({
            abi: wagmiContract.abi,
            chain: ethClient.chain,
            account: toAddress,
            bytecode: wagmiContract.bytecode,
            args: ["", "", toAddress]
        })

        const transaction = await publicClient.waitForTransactionReceipt({
            hash,
        });

        console.log(`Contract deployed at address: ${transaction.contractAddress}`);


        // });

        // const contractFactory = new ethers.ContractFactory(abi, byteCode, signer);

        // const contract = await contractFactory.deploy(
        //     "name",
        //     "symbol",
        //     fundedEthWallet.address
        // );
        // await contract.waitForDeployment();

        // // Assert that the contract is deployed
        // expect(contract.target).to.not.be.undefined;

        // // Assert that contract bytecode exists (it will be different from what we set)
        // const deployedByteCode = await provider.getCode(contract.target);
        // expect(deployedByteCode).to.not.be.undefined;
        // expect(deployedByteCode.length).to.be.greaterThan(100);
        // expect(deployedByteCode).to.contain("0x60806040523480156");
    });

    it("Can deploy bridge token contract with gas limit", async () => {
        // await usingEthApi(async (provider) => {
        //     const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
        //     await usingApi(async (api) => {
        //         // Alice gives permission to signer to create a contract
        //         const txSudoSetWhitelist = api.tx.sudo.sudo(
        //             api.tx.evm.setWhitelist([signer.address])
        //         );

        //         await sendTransaction(api, txSudoSetWhitelist, tk.alice);
        //     });

        //     const contractFactory = new ethers.ContractFactory(abi, byteCode, signer);

        //     const successful_gas_limit = "12345678";
        //     const contract = await contractFactory.deploy(
        //         "name",
        //         "symbol",
        //         fundedEthWallet.address,
        //         {
        //             gasLimit: successful_gas_limit,
        //         }
        //     );

        //     await contract.waitForDeployment();

        //     // Assert that the contract is deployed
        //     expect(contract.target).to.not.be.undefined;

        //     // Assert that contract bytecode exists (it will be different from what we set)
        //     const deployedByteCode = await provider.getCode(contract.target);
        //     expect(deployedByteCode).to.not.be.undefined;
        //     expect(deployedByteCode.length).to.be.greaterThan(100);
        //     expect(deployedByteCode).to.contain("0x60806040523480156");
        // });
    });
});