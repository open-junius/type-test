
import * as assert from "assert";
import * as chai from "chai";

import { getAliceSigner, getClient, getDevnetApi, waitForTransactionCompletion, convertPublicKeyToMultiAddress } from "../src/substrate"
import { generateRandomWallet, getWalletClient, convertH160ToSS58 } from "../src/utils";


describe("Test the EVM chain ID", () => {
  before(async () => {
    let subClient = await getClient('ws://localhost:9944')
    let api = await getDevnetApi(subClient)
    let alice = await getAliceSigner();
    let multiAddress = convertPublicKeyToMultiAddress(alice.publicKey)
    const internalCall = api.tx.Balances.force_set_balance({ who: multiAddress, new_free: BigInt(1e18) })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })
    await waitForTransactionCompletion(tx, alice)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

  });

  it("EVM chain id is the same, update chain id failed not sudo call", async () => {
    let wallet = generateRandomWallet();
    let ethClient = await getWalletClient('http://localhost:9944', wallet);
    let ss58Address = convertH160ToSS58(wallet.address)
    let chainId = await ethClient.getChainId();
    assert.equal(chainId, 42);

    let subClient = await getClient('ws://localhost:9944')
    let api = await getDevnetApi(subClient)

    let alice = await getAliceSigner();
    const internalCall = api.tx.AdminUtils.sudo_set_evm_chain_id({ chain_id: BigInt(100) })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })


    await waitForTransactionCompletion(tx, alice)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

    chainId = await ethClient.getChainId();
    assert.equal(chainId, 100);

  });
});