import { getWalletClient } from "./utils";

import { getHash, printBalance, printBasicInfo, transferBalance } from "./eth";

import { getBalance, getClient, getDevnetApi } from "./substrate"

async function main() {
    let subClient = await getClient('ws://localhost:9944')
    let api = await getDevnetApi(subClient)

    api.query.System.Events.watchValue("finalized").subscribe()
}

main();

