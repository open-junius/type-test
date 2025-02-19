import { publicKeyToAddress } from "viem/accounts";
import { convertH160ToSS58, getWalletClient } from "./utils";
// import { ethers } from "ethers";

export async function printBasicInfo() {
    const privateKey = generateRandomAddress().privateKey
    const wallet = await getWalletClient('http://localhost:9944', privateKey)

    console.log("chain id is: ", await wallet.getChainId());
    // const address = await wallet.account.address;

    const balance = await wallet.getBalance({ address: wallet.account.address });

    console.log("account address is: ", wallet.account.address);
    console.log("account balance is: ", balance.toString());
    console.log("nonce is ", await wallet.getTransactionCount({ address: wallet.account.address }));
}

export async function printBalance() {
    const wallet = await getWalletClient('http://localhost:9944')
    // const wallet = await getWalletClient('http://localhost:9944')

    // 0xBBCa0709c54CD137145AAb34c02754f582B94b08
    // const toAddress = "A0Cf798816D4b9b9866b5330EEa46a18382f251e";
    const toAddress = "BBCa0709c54CD137145AAb34c02754f582B94b08";


    const balance = await wallet.getBalance({ address: `0x${toAddress}` });
    console.log(balance.toString());
    console.log(await wallet.getTransactionCount({ address: `0x${toAddress}` }));

}

export async function getHash() {
    const txHash = "0xd4261e3218589419e011bbfee2e7c5577f7bf17bb7be4675d219d9accaa62844"

    const wallet = await getWalletClient('http://localhost:9944')
    // const tx = await wallet.getTransaction({ hash: txHash });

    const ss58 = convertH160ToSS58("0xBBCa0709c54CD137145AAb34c02754f582B94b08");

    console.log(ss58)

}
export async function transferBalance() {
    const wallet = await getWalletClient('http://localhost:9944')

    console.log(await wallet.getChainId());

    const toAddress = "A0Cf798816D4b9b9866b5330EEa46a18382f251e";
    console.log(await wallet.getBalance({ address: `0x${toAddress}` }));

    const tx = {
        to: toAddress,
        value: ethers.parseEther("0.1"),
        gasLimit: 21000,
    }

    const response = await wallet.sendTransaction({ ...tx, to: `0x${tx.to}` });

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(await wallet.getBalance({ address: `0x${toAddress}` }));
}