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

const MockPancakeRouter = artifacts.require("MockPancakeRouter");

const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));


contract('CommunityTaxVault Contract', (accounts) => {
    it('Test Claim BNB', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        rewardMaintainer = accounts[2];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const communityTaxInst = await CommunityTaxVault.deployed();

        await web3.eth.sendTransaction({ from: initialGov, to: CommunityTaxVault.address, value: web3.utils.toBN(1e18), chainId: 666})

        try {
            await communityTaxInst.claimBNB(web3.utils.toBN(1e18), player0, {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("only governance is allowed"));
        }

        const beforeClaimBNBPlayer0 = await web3.eth.getBalance(player0);
        let claimBNBTx = await communityTaxInst.claimBNB(web3.utils.toBN(1e16), player0, {from: initialGov, chainId: 666});
        truffleAssert.eventEmitted(claimBNBTx, "Withdraw",(ev) => {
            return ev.recipient.toLowerCase() === player0.toLowerCase() && ev.amount.toString() === "10000000000000000";
        });
        const afterClaimBNBPlayer0 = await web3.eth.getBalance(player0);
        assert.equal(web3.utils.toBN(afterClaimBNBPlayer0).sub(web3.utils.toBN(beforeClaimBNBPlayer0)).eq(web3.utils.toBN("10000000000000000")), true, "wrong claimed BNB amount");


        claimBNBTx = await communityTaxInst.claimBNB(web3.utils.toBN(1e18), player0, {from: initialGov, chainId: 666});
        truffleAssert.eventEmitted(claimBNBTx, "Withdraw",(ev) => {
            return ev.recipient.toLowerCase() === player0.toLowerCase() && ev.amount.toString() === "990000000000000000";
        });
    });
    it('Test Transfer governorship', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        rewardMaintainer = accounts[2];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const communityTaxInst = await CommunityTaxVault.deployed();

        try {
            await communityTaxInst.transferGovernorship("0x0000000000000000000000000000000000000000", {from: initialGov});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("new governor is zero address"));
        }

        try {
            await communityTaxInst.transferGovernorship(player0, {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("only governance is allowed"));
        }

        let transferGovernorshipTx = await communityTaxInst.transferGovernorship(player0, {from: initialGov, chainId: 666});
        truffleAssert.eventEmitted(transferGovernorshipTx, "GovernorshipTransferred",(ev) => {
            return ev.oldGovernor.toLowerCase() === initialGov.toLowerCase() && ev.newGovernor.toLowerCase() === player0.toLowerCase();
        });
        let governor = await communityTaxInst.governor();
        assert.equal(governor, player0, "wrong governship owner");

        await communityTaxInst.transferGovernorship(initialGov, {from: player0, chainId: 666});
        governor = await communityTaxInst.governor();
        assert.equal(governor, initialGov, "wrong governship owner");
    });
    it('Test buyAndBurnSBF', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        rewardMaintainer = accounts[2];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const communityTaxInst = await CommunityTaxVault.deployed();

        const steakBankInst = await SteakBank.deployed();
        const lbnbInst = await LBNB.deployed();
        await steakBankInst.stake("1000000000000000000", {from: player0, value: 102e16});
        await lbnbInst.approve(SteakBank.address, web3.utils.toBN("999000000000000000"), {from: player0})
        await steakBankInst.unstake(web3.utils.toBN("999000000000000000"), {from: player0});

        const sbfInst = await SBF.deployed();
        await sbfInst.transfer(MockPancakeRouter.address, web3.utils.toBN(1e18), {from: initialGov});
        try {
            await communityTaxInst.buyAndBurnSBF({from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("only governance is allowed"));
        }

        let buyAndBurnSBFTx = await communityTaxInst.buyAndBurnSBF({from: initialGov, chainId: 666});
        truffleAssert.eventEmitted(buyAndBurnSBFTx, "BuyAndBurnSBF",(ev) => {
            return ev.burnedSBFAmount.toString() === "750000000000000000" && ev.costBNBAmount.toString() === "1000000000000000" && ev.costLBNBAmount.toString() === "999000000000000";
        });
    });
    it('Test change LBNBAddr, SBFAddr and PancakeRouterAddr', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        rewardMaintainer = accounts[2];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const communityTaxInst = await CommunityTaxVault.deployed();

        try {
            await communityTaxInst.setLBNBAddr(SBF.address, {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("only governance is allowed"));
        }
        try {
            await communityTaxInst.setSBFAddr(LBNB.address, {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("only governance is allowed"));
        }
        try {
            await communityTaxInst.setPancakeRouterAddr(SBF.address, {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("only governance is allowed"));
        }

        await communityTaxInst.setLBNBAddr(SBF.address, {from: initialGov});
        const lbnbAddr = await communityTaxInst.lbnbAddr();
        assert.equal(lbnbAddr.toString().toLowerCase(), SBF.address.toString().toLowerCase(), "wrong lbnb addr");
        await communityTaxInst.setLBNBAddr(LBNB.address, {from: initialGov});

        await communityTaxInst.setSBFAddr(LBNB.address, {from: initialGov});
        const sbfAddr = await communityTaxInst.sbfAddr();
        assert.equal(sbfAddr.toString().toLowerCase(), LBNB.address.toString().toLowerCase(), "wrong sbf addr");
        await communityTaxInst.setSBFAddr(SBF.address, {from: initialGov});

        await communityTaxInst.setPancakeRouterAddr(SBF.address, {from: initialGov});
        const pancakeRouterAddr = await communityTaxInst.pancakeRouterAddr();
        assert.equal(pancakeRouterAddr.toString().toLowerCase(), SBF.address.toString().toLowerCase(), "wrong pancakeRouter addr");
        await communityTaxInst.setPancakeRouterAddr(MockPancakeRouter.address, {from: initialGov});
    });
});