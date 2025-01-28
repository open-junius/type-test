import { getWalletClient } from "./utils";

import { getHash, printBalance, printBasicInfo, transferBalance } from "./eth";

import { getApi } from "./substrate"

async function main() {
    await printBalance();
    const api = getApi('wss://test.finney.opentensor.ai:443')

    console.log("hello world");
}

main();

