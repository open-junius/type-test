
import * as assert from "assert";
import * as chai from "chai";

import {printBasicInfo} from "../src/eth";
import {generateRandomAddress, getWalletClient} from "../src/utils";

describe("Test the EVM chain ID", () => {
    before(async () => {
        
    });

    it("EVM chain id is the same, update chain id failed not sudo call", async () => {
        let account = generateRandomAddress();
        let client = await getWalletClient('http://localhost:9944', account.privateKey);
        let chainId = await client.getChainId();
        assert.equal(chainId, 43);

        
      });
});