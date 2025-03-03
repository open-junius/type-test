import * as assert from "assert";

import { getAliceSigner, getClient, getDevnetApi, waitForTransactionCompletion, convertPublicKeyToMultiAddress, getRandomSubstrateKeypair } from "../src/substrate"
import { SUB_LOCAL_URL, } from "../src/config";
import { devnet, MultiAddress } from "@polkadot-api/descriptors"
import { PolkadotSigner, TypedApi } from "polkadot-api";
import { convertH160ToSS58 } from "../src/address-utils"
import { generateRandomEthersWallet } from "../src/utils";
import { tao } from "../src/balance-math"
import { ISubnetABI, ISUBNET_ADDRESS } from "../src/contracts/subnet"
import { ethers } from "ethers"

describe("Test the EVM chain ID", () => {
    // init eth part
    const wallet = generateRandomEthersWallet();
    // init substrate part
    const hotkey1 = getRandomSubstrateKeypair();
    const hotkey2 = getRandomSubstrateKeypair();

    let api: TypedApi<typeof devnet>
    // sudo account alice as signer
    let alice: PolkadotSigner;

    // init other variable
    let subnetId = 0;

    before(async () => {
        // init variables got from await and async
        const subClient = await getClient(SUB_LOCAL_URL)
        api = await getDevnetApi(subClient)
        alice = await getAliceSigner();

        {
            const multiAddress = convertPublicKeyToMultiAddress(hotkey1.publicKey)
            const internalCall = api.tx.Balances.force_set_balance({ who: multiAddress, new_free: tao(1000000) })
            const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

            await waitForTransactionCompletion(api, tx, alice)
                .then(() => { })
                .catch((error) => { console.log(`transaction error ${error}`) });
        }

        {
            const multiAddress = convertPublicKeyToMultiAddress(hotkey2.publicKey)
            const internalCall = api.tx.Balances.force_set_balance({ who: multiAddress, new_free: tao(1000000) })
            const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

            await waitForTransactionCompletion(api, tx, alice)
                .then(() => { })
                .catch((error) => { console.log(`transaction error ${error}`) });
        }

        {
            const ss58Address = convertH160ToSS58(wallet.address)
            const internalCall = api.tx.Balances.force_set_balance({ who: MultiAddress.Id(ss58Address), new_free: tao(1000000) })
            const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

            await waitForTransactionCompletion(api, tx, alice)
                .then(() => { })
                .catch((error) => { console.log(`transaction error ${error}`) });
        }

        {
            const internalCall = api.tx.AdminUtils.sudo_set_network_rate_limit({ rate_limit: BigInt(0) })
            const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })
            await waitForTransactionCompletion(api, tx, alice)
                .then(() => { })
                .catch((error) => { console.log(`transaction error ${error}`) });
        }
    })

    it("Can register network without identity info", async () => {
        const totalNetwork = await api.query.SubtensorModule.TotalNetworks.getValue()

        const contract = new ethers.Contract(ISUBNET_ADDRESS, ISubnetABI, wallet);
        const tx = await contract.registerNetwork(hotkey1.publicKey);
        await tx.wait();

        const totalNetworkAfterAdd = await api.query.SubtensorModule.TotalNetworks.getValue()
        assert.ok(totalNetwork + 1 === totalNetworkAfterAdd)
    });

    it("Can register network with identity info", async () => {
        const totalNetwork = await api.query.SubtensorModule.TotalNetworks.getValue()

        const contract = new ethers.Contract(ISUBNET_ADDRESS, ISubnetABI, wallet);
        const tx = await contract.registerNetwork(hotkey2.publicKey,
            "name",
            "repo",
            "contact",
            "subnetUrl",
            "discord",
            "description",
            "additional"
        );
        await tx.wait();

        const totalNetworkAfterAdd = await api.query.SubtensorModule.TotalNetworks.getValue()
        assert.ok(totalNetwork + 1 === totalNetworkAfterAdd)
    });

    it("Can set subnet parameter", async () => {

        const totalNetwork = await api.query.SubtensorModule.TotalNetworks.getValue()
        const contract = new ethers.Contract(ISUBNET_ADDRESS, ISubnetABI, wallet);
        const newSubnetId = totalNetwork - 1;

        // servingRateLimit hyperparameter
        {
            const newValue = 100;
            const tx = await contract.setServingRateLimit(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.ServingRateLimit.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getServingRateLimit(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // minDifficulty hyperparameter 
        //
        // disabled: only by sudo
        //
        // newValue = 101;
        // tx = await contract.setMinDifficulty(newSubnetId, newValue);
        // await tx.wait();

        // await usingApi(async (api) => {
        //   onchainValue = Number(
        //     await api.query.subtensorModule.minDifficulty(newSubnetId)
        //   );
        // });

        // valueFromContract = Number(await contract.getMinDifficulty(newSubnetId));

        // expect(valueFromContract).to.eq(newValue);
        // expect(valueFromContract).to.eq(onchainValue);

        // maxDifficulty hyperparameter

        {
            const newValue = 102;
            const tx = await contract.setMaxDifficulty(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.MaxDifficulty.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getMaxDifficulty(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // weightsVersionKey hyperparameter
        {
            const newValue = 103;
            const tx = await contract.setWeightsVersionKey(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.WeightsVersionKey.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getWeightsVersionKey(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }
        // weightsSetRateLimit hyperparameter
        {
            const newValue = 104;
            const tx = await contract.setWeightsSetRateLimit(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.WeightsSetRateLimit.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getWeightsSetRateLimit(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // adjustmentAlpha hyperparameter
        {
            const newValue = 105;
            const tx = await contract.setAdjustmentAlpha(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.AdjustmentAlpha.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getAdjustmentAlpha(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // maxWeightLimit hyperparameter
        {
            const newValue = 106;
            const tx = await contract.setMaxWeightLimit(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.MaxWeightsLimit.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getMaxWeightLimit(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }
        // immunityPeriod hyperparameter
        {
            const newValue = 107;
            const tx = await contract.setImmunityPeriod(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.ImmunityPeriod.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getImmunityPeriod(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // minAllowedWeights hyperparameter
        {
            const newValue = 108;
            const tx = await contract.setMinAllowedWeights(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.MinAllowedWeights.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getMinAllowedWeights(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // kappa hyperparameter
        {
            const newValue = 109;
            const tx = await contract.setKappa(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.Kappa.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getKappa(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // rho hyperparameter
        {
            const newValue = 110;
            const tx = await contract.setRho(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.Rho.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getRho(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // activityCutoff hyperparameter
        {
            const newValue = 111;
            const tx = await contract.setActivityCutoff(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.ActivityCutoff.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getActivityCutoff(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // networkRegistrationAllowed hyperparameter
        {
            const newValue = true;
            const tx = await contract.setNetworkRegistrationAllowed(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.NetworkRegistrationAllowed.getValue(newSubnetId)


            let valueFromContract = Boolean(
                await contract.getNetworkRegistrationAllowed(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // networkPowRegistrationAllowed hyperparameter
        {
            const newValue = true;
            const tx = await contract.setNetworkPowRegistrationAllowed(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.NetworkPowRegistrationAllowed.getValue(newSubnetId)


            let valueFromContract = Boolean(
                await contract.getNetworkPowRegistrationAllowed(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // minBurn hyperparameter. only sudo can set it now
        // newValue = 112;

        // tx = await contract.setMinBurn(newSubnetId, newValue);
        // await tx.wait();

        // await usingApi(async (api) => {
        //   onchainValue = Number(
        //     await api.query.subtensorModule.minBurn(newSubnetId)
        //   );
        // });

        // valueFromContract = Number(await contract.getMinBurn(newSubnetId));

        // expect(valueFromContract).to.eq(newValue);
        // expect(valueFromContract).to.eq(onchainValue);

        // maxBurn hyperparameter
        {
            const newValue = 113;
            const tx = await contract.setMaxBurn(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.MaxBurn.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getMaxBurn(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }


        // difficulty hyperparameter (disabled: sudo only)
        // newValue = 114;

        // tx = await contract.setDifficulty(newSubnetId, newValue);
        // await tx.wait();

        // await usingApi(async (api) => {
        //   onchainValue = Number(
        //     await api.query.subtensorModule.difficulty(newSubnetId)
        //   );
        // });

        // valueFromContract = Number(await contract.getDifficulty(newSubnetId));

        // expect(valueFromContract).to.eq(newValue);
        // expect(valueFromContract).to.eq(onchainValue);

        // bondsMovingAverage hyperparameter
        {
            const newValue = 115;
            const tx = await contract.setBondsMovingAverage(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.BondsMovingAverage.getValue(newSubnetId)


            let valueFromContract = Number(
                await contract.getBondsMovingAverage(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }


        // commitRevealWeightsEnabled hyperparameter
        {
            const newValue = true;
            const tx = await contract.setCommitRevealWeightsEnabled(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.CommitRevealWeightsEnabled.getValue(newSubnetId)


            let valueFromContract = Boolean(
                await contract.getCommitRevealWeightsEnabled(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // liquidAlphaEnabled hyperparameter
        {
            const newValue = true;
            const tx = await contract.setLiquidAlphaEnabled(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.LiquidAlphaOn.getValue(newSubnetId)


            let valueFromContract = Boolean(
                await contract.getLiquidAlphaEnabled(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

        // alphaValues hyperparameter
        {
            const newValue = [118, 52429];
            const tx = await contract.setAlphaValues(newSubnetId, newValue[0], newValue[1]);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.AlphaValues.getValue(newSubnetId)

            let value = await contract.getAlphaValues(newSubnetId)
            let valueFromContract = [Number(value[0]), Number(value[1])]

            assert.equal(valueFromContract[0], newValue[0])
            assert.equal(valueFromContract[1], newValue[1])
            assert.equal(valueFromContract[0], onchainValue[0]);
            assert.equal(valueFromContract[1], onchainValue[1]);
        }

        // commitRevealWeightsInterval hyperparameter
        {
            const newValue = 119;
            const tx = await contract.setCommitRevealWeightsInterval(newSubnetId, newValue);
            await tx.wait();

            let onchainValue = await api.query.SubtensorModule.RevealPeriodEpochs.getValue(newSubnetId)

            let valueFromContract = Number(
                await contract.getCommitRevealWeightsInterval(newSubnetId)
            );

            assert.equal(valueFromContract, newValue)
            assert.equal(valueFromContract, onchainValue);
        }

    })
});