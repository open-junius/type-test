import { getWalletClient } from "./utils";

import { printAddress } from "./eth";

async function main() {
    await printAddress();
    console.log("hello world");
}

main();

