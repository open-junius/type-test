
import * as assert from "assert";
import * as chai from "chai";

import { getAliceSigner, getClient, getDevnetApi, waitForTransactionCompletion, convertPublicKeyToMultiAddress, getRandomKeypair, getNonce, convertPublicKeyToSs58, waitForFinalizedBlock } from "../src/substrate"
import { generateRandomWallet, getWalletClient, convertH160ToSS58 } from "../src/utils";


describe("Test the EVM chain ID", () => {
  let wallet = generateRandomWallet();
  let ethClient;
  let subClient;
  let api;


  before(async () => {
    subClient = await getClient('ws://localhost:9944')
    api = await getDevnetApi(subClient)

    let alice = await getAliceSigner();

    let account = getRandomKeypair()
    let multiAddress = convertPublicKeyToMultiAddress(account.publicKey)
    const internalCall = api.tx.Balances.force_set_balance({ who: multiAddress, new_free: BigInt(1e12) })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

  });

  it("EVM chain id is the same, update chain id is ok", async () => {

    ethClient = await getWalletClient('http://localhost:9944', wallet);
    let chainId = await ethClient.getChainId();
    // init chain id should be 42
    assert.equal(chainId, 42);

    let subClient = await getClient('ws://localhost:9944')
    let api = await getDevnetApi(subClient)

    let alice = await getAliceSigner();

    let internalCall = api.tx.AdminUtils.sudo_set_evm_chain_id({ chain_id: BigInt(100) })
    let tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

    chainId = await ethClient.getChainId();
    assert.equal(chainId, 100);

    internalCall = api.tx.AdminUtils.sudo_set_evm_chain_id({ chain_id: BigInt(42) })
    tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

    chainId = await ethClient.getChainId();
    // back to original value for other tests. and we can run it repeatedly
    assert.equal(chainId, 42);

  });
});