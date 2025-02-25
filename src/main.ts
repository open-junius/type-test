import { generateRandomEthersWallet, getPublicClient } from "./utils";

import { getHash, printBalance, printBasicInfo, transferBalance } from "./eth";

import { getBalance, getClient, getDevnetApi } from "./substrate"
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';

import { ETH_LOCAL_URL } from "./config"
import { raoToEth, tao } from "./balance-math";
import { ethers } from "ethers"

async function main() {

    // const subClient = await getClient(SUB_LOCAL_URL)
    // api = await getDevnetApi(subClient)
    // alice = await getAliceSigner();

    // const wallet = generateRandomEthersWallet();
    // const wallet2 = generateRandomEthersWallet();
    // const publicClient = await getPublicClient(ETH_LOCAL_URL)
    // const provider = new ethers.JsonRpcProvider(ETH_LOCAL_URL);

    // const transferBalance = raoToEth(tao(1))

    // // console.log(sendBalance, receiverBalance, transferBalance, transferBalance.toString())

    // const tx = {
    //     to: wallet2.address,
    //     amount: transferBalance.toString()
    // }

    // const hash = await wallet.sendTransaction(tx)

    // console.log(hash)

    // await hash.wait();

    // await new Promise(resolve => setTimeout(resolve, 1000));


    // const a = await provider.getBalance(wallet.address)
    // const b = await provider.getBalance(wallet2.address)

    // console.log("a and b", a, b)

}

main();

