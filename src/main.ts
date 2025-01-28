import { getWalletClient } from "./utils";

import { getHash, printBalance, printBasicInfo, transferBalance } from "./eth";

import { getBalance } from "./substrate"

async function main() {
    await printBalance();
    await getBalance();

    console.log("hello world");
}

main();

