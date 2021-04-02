const { expectRevert, time } = require('@openzeppelin/test-helpers');
const sleep = require("await-sleep");

const LBNB = artifacts.require("LBNB");
const SBF = artifacts.require("SBF");

const UnstakeVault = artifacts.require("UnstakeVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");

const SteakBank = artifacts.require("SteakBankImpl");

const FarmRewardLock = artifacts.require("FarmRewardLock");
const FarmingCenter = artifacts.require("FarmingCenter");

const Governor = artifacts.require("Governor");
const Timelock = artifacts.require("Timelock");

const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

contract('Governance Contract', (accounts) => {
    it('Test Submit Proposal', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const governorInst = await Governor.deployed();
        const sbfInst = await SBF.deployed();
        const fakePancakeRouter = accounts[2];

        await sbfInst.delegate(initialGov, {from: initialGov})
        await sbfInst.transfer(player0, web3.utils.toBN(1e7).mul(web3.utils.toBN(1e18)), {from: initialGov})
        await sbfInst.transfer(player1, web3.utils.toBN(1e7).mul(web3.utils.toBN(1e18)), {from: initialGov})
        await sbfInst.delegate(player0, {from: player0})
        await sbfInst.delegate(player1, {from: player1})

        let currentVotes = await sbfInst.getCurrentVotes(player0);
        assert.equal(currentVotes.toString(), web3.utils.toBN(1e7).mul(web3.utils.toBN(1e18)).toString(), "wrong voting power");
        currentVotes = await sbfInst.getCurrentVotes(initialGov);
        assert.equal(currentVotes.toString(), "26000000000000000000000000", "wrong voting power")

        const abiEncodeDataForSetPancakeRouterAddr = web3.eth.abi.encodeFunctionCall({
            "inputs": [
                {
                    "internalType": "address",
                    "name": "newPancakeRouterAddr",
                    "type": "address"
                }
            ],
            "name": "setPancakeRouterAddr",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, [fakePancakeRouter]);

        await governorInst.propose([CommunityTaxVault.address],[web3.utils.toBN(0)], [""], [abiEncodeDataForSetPancakeRouterAddr], "setPancakeRouterAddr", {from: player0});

        await time.advanceBlock();

        await governorInst.castVote(1, true, {from: player0});
        await governorInst.castVote(1, true, {from: player1});
        await governorInst.castVote(1, true, {from: initialGov});

        let currentBlockNumber = await time.latestBlock();
        await time.advanceBlockTo(currentBlockNumber.add(web3.utils.toBN(11)));

        const state = await governorInst.state(1);
        assert.equal(state.toString(), "4", "wrong proposal state");

        await governorInst.queue(1, {from: player1});

        await time.advanceBlock();
        await sleep(11 * 1000);

        try {
            await governorInst.execute(1, {from: player1});
            assert.fail();
        } catch (error) {
        }

        const communityTaxVaultInst = await CommunityTaxVault.deployed();

        await communityTaxVaultInst.transferGovernorship(Timelock.address, {from: initialGov});

        let newPancakeRouterAddr = await communityTaxVaultInst.pancakeRouterAddr();
        assert.notEqual(fakePancakeRouter.toString(), newPancakeRouterAddr.toString(), "wrong pancakeRouterAddr")

        await governorInst.execute(1, {from: player1});

        newPancakeRouterAddr = await communityTaxVaultInst.pancakeRouterAddr();
        assert.equal(fakePancakeRouter.toString(), newPancakeRouterAddr.toString(), "wrong pancakeRouterAddr")
    });
});