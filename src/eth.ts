import { getWalletClient } from "./utils";
export async function printAddress() {
    // const wallet = await getWalletClient('https://dev.chain.opentensor.ai')
    const wallet = await getWalletClient('http://localhost:9944')

    console.log(wallet.account.address);
    console.log(await wallet.getBalance({ address: wallet.account.address }));
    console.log("hello world");
}
