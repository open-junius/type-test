import { publicKeyToAddress } from "viem/accounts";
import { convertH160ToSS58, getWalletClient, generateRandomWallet } from "./utils";
import { verifyMessage } from "viem/_types/actions/public/verifyMessage";
// import { ethers } from "ethers";

export async function printBasicInfo() {
    const ethClient = await getWalletClient('http://localhost:9944', generateRandomWallet())

    console.log("chain id is: ", await ethClient.getChainId());
    // const address = await wallet.account.address;

    const balance = await ethClient.getBalance({ address: ethClient.account.address });

    console.log("account address is: ", ethClient.account.address);
    console.log("account balance is: ", balance.toString());
    console.log("nonce is ", await ethClient.getTransactionCount({ address: ethClient.account.address }));
}

export async function printBalance() {
    const wallet = await getWalletClient('http://localhost:9944', generateRandomWallet())
    const toAddress = "BBCa0709c54CD137145AAb34c02754f582B94b08";


    const balance = await wallet.getBalance({ address: `0x${toAddress}` });
    console.log(balance.toString());
    console.log(await wallet.getTransactionCount({ address: `0x${toAddress}` }));

}

export async function getHash() {
    const txHash = "0xd4261e3218589419e011bbfee2e7c5577f7bf17bb7be4675d219d9accaa62844"

    const wallet = await getWalletClient('http://localhost:9944', generateRandomWallet())

    const ss58 = convertH160ToSS58("0xBBCa0709c54CD137145AAb34c02754f582B94b08");

    console.log(ss58)

}
export async function transferBalance() {
    const wallet = await getWalletClient('http://localhost:9944', generateRandomWallet())

    console.log(await wallet.getChainId());

    const toAddress = "A0Cf798816D4b9b9866b5330EEa46a18382f251e";
    console.log(await wallet.getBalance({ address: `0x${toAddress}` }));

    const tx = {
        to: toAddress,
        value: 21000,
        gasLimit: 21000,
    }

    await wallet.sendTransaction({ tx, to: `0x${tx.to}` });

    console.log(await wallet.getBalance({ address: `0x${toAddress}` }));
}