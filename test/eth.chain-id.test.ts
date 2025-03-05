
import * as assert from "assert";
import * as chai from "chai";

import { getAliceSigner, getDevnetApi, waitForTransactionCompletion, getRandomSubstrateKeypair, convertPublicKeyToSs58 } from "../src/substrate"
import { generateRandomEthWallet, getWalletClient } from "../src/utils";
import { ETH_LOCAL_URL } from "../src/config";
import { devnet } from "@polkadot-api/descriptors"
import { getPolkadotSigner } from "polkadot-api/signer";
import { WalletClient } from "viem";
import { PolkadotSigner, TypedApi } from "polkadot-api";
import { forceSetBalanceToSs58Address, forceSetChainID } from "../src/subtensor";

describe("Test the EVM chain ID", () => {
  // init eth part
  const wallet = generateRandomEthWallet();
  let ethClient: WalletClient;

  // init substrate part
  const keyPair = getRandomSubstrateKeypair();
  let api: TypedApi<typeof devnet>

  // sudo account alice as signer
  let alice: PolkadotSigner;

  // init other variable
  const initChainId = 42;

  before(async () => {
    // init variables got from await and async
    ethClient = await getWalletClient(ETH_LOCAL_URL, wallet);
    api = await getDevnetApi()
    alice = await getAliceSigner();

    await forceSetBalanceToSs58Address(api, convertPublicKeyToSs58(keyPair.publicKey))


  });

  it("EVM chain id update is ok", async () => {
    let chainId = await ethClient.getChainId();
    // init chain id should be 42
    assert.equal(chainId, initChainId);

    const newChainId = BigInt(100)
    await forceSetChainID(api, newChainId)

    chainId = await ethClient.getChainId();
    assert.equal(chainId, newChainId);

    await forceSetChainID(api, BigInt(initChainId))

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