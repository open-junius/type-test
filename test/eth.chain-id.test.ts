
import * as assert from "assert";
import * as chai from "chai";

import { getAliceSigner, getClient, getDevnetApi, waitForTransactionCompletion, convertPublicKeyToMultiAddress, getRandomSubstrateKeypair, getNonce, convertPublicKeyToSs58, waitForFinalizedBlock } from "../src/substrate"
import { generateRandomEthWallet, getWalletClient, convertH160ToSS58 } from "../src/utils";
import { ETH_LOCAL_URL, SUB_LOCAL_URL } from "../src/config";

import { getPolkadotSigner } from "polkadot-api/signer";

describe("Test the EVM chain ID", async () => {
  // init eth part
  const wallet = generateRandomEthWallet();
  const ethClient = await getWalletClient(ETH_LOCAL_URL, wallet);

  // init substrate part
  const keyPair = getRandomSubstrateKeypair();
  const subClient = await getClient(SUB_LOCAL_URL)
  const api = await getDevnetApi(subClient)

  const alice = await getAliceSigner();

  // init other variable
  const initChainId = 42;

  before(async () => {
    // let account = getRandomSubstrateKeypair()
    let multiAddress = convertPublicKeyToMultiAddress(keyPair.publicKey)
    const internalCall = api.tx.Balances.force_set_balance({ who: multiAddress, new_free: BigInt(1e12) })
    const tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

  });

  it("EVM chain id update is ok", async () => {
    let chainId = await ethClient.getChainId();

    // init chain id should be 42
    assert.equal(chainId, initChainId);

    let internalCall = api.tx.AdminUtils.sudo_set_evm_chain_id({ chain_id: BigInt(100) })
    let tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

    chainId = await ethClient.getChainId();
    assert.equal(chainId, 100);

    internalCall = api.tx.AdminUtils.sudo_set_evm_chain_id({ chain_id: BigInt(initChainId) })
    tx = api.tx.Sudo.sudo({ call: internalCall.decodedCall })

    await waitForTransactionCompletion(api, tx, alice)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

    chainId = await ethClient.getChainId();
    // back to original value for other tests. and we can run it repeatedly
    assert.equal(chainId, initChainId);

  });

  it("EVM chain id is the same, only sudo can change it.", async () => {
    let chainId = await ethClient.getChainId();
    // init chain id should be 42
    assert.equal(chainId, initChainId);

    // invalide signer for set chain ID
    let signer = getPolkadotSigner(
      keyPair.publicKey,
      "Sr25519",
      keyPair.sign,
    )

    let tx = api.tx.AdminUtils.sudo_set_evm_chain_id({ chain_id: BigInt(100) })

    await waitForTransactionCompletion(api, tx, signer)
      .then(() => { })
      .catch((error) => { console.log(`transaction error ${error}`) });

    // extrinsic should be failed and chain ID not updated.
    chainId = await ethClient.getChainId();
    assert.equal(chainId, 42);

  });
});