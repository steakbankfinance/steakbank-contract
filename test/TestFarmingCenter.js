const { expectRevert, time } = require('@openzeppelin/test-helpers');

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

contract('FarmingCenter Contract', (accounts) => {
    it('Test Deposit SBF', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const sbfInst = await SBF.deployed();
        const farmingCenterInst = await FarmingCenter.deployed();

        await sbfInst.transfer(player0, web3.utils.toBN("10000").mul(web3.utils.toBN(1e18)), {from: initialGov});
        await sbfInst.transfer(player1, web3.utils.toBN("20000").mul(web3.utils.toBN(1e18)), {from: initialGov});
        await sbfInst.transfer(player2, web3.utils.toBN("30000").mul(web3.utils.toBN(1e18)), {from: initialGov});
        await sbfInst.transfer(player3, web3.utils.toBN("40000").mul(web3.utils.toBN(1e18)), {from: initialGov});
        await sbfInst.transfer(player4, web3.utils.toBN("50000").mul(web3.utils.toBN(1e18)), {from: initialGov});

        await sbfInst.approve(FarmingCenter.address, web3.utils.toBN("10000").mul(web3.utils.toBN(1e18)), {from: player0});
        await sbfInst.approve(FarmingCenter.address, web3.utils.toBN("20000").mul(web3.utils.toBN(1e18)), {from: player1});
        await sbfInst.approve(FarmingCenter.address, web3.utils.toBN("30000").mul(web3.utils.toBN(1e18)), {from: player2});
        await sbfInst.approve(FarmingCenter.address, web3.utils.toBN("40000").mul(web3.utils.toBN(1e18)), {from: player3});
        await sbfInst.approve(FarmingCenter.address, web3.utils.toBN("50000").mul(web3.utils.toBN(1e18)), {from: player4});

        await farmingCenterInst.deposit(0, web3.utils.toBN("10").mul(web3.utils.toBN(1e18)), {from: player0});

        await time.advanceBlock();

        let pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(0, player0);
        assert(pendingSBFPlayer0, "0", "wrong pending SBF");

        await time.advanceBlock();
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(0, player0);
        assert.equal(web3.utils.toBN(pendingSBFPlayer0).eq(web3.utils.toBN("10").mul(web3.utils.toBN(1e18))), true, "wrong pending SBF");

        await time.advanceBlock();
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(0, player0);
        assert.equal(web3.utils.toBN(pendingSBFPlayer0).eq(web3.utils.toBN("20").mul(web3.utils.toBN(1e18))), true, "wrong pending SBF");

        await farmingCenterInst.deposit(0, web3.utils.toBN("20").mul(web3.utils.toBN(1e18)), {from: player1});
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(0, player0);
        assert.equal(web3.utils.toBN(pendingSBFPlayer0).eq(web3.utils.toBN("30").mul(web3.utils.toBN(1e18))), true, "wrong pending SBF");
        let pendingSBFPlayer1 = await farmingCenterInst.pendingSBF(0, player1);
        assert.equal(web3.utils.toBN(pendingSBFPlayer1).eq(web3.utils.toBN("0").mul(web3.utils.toBN(1e18))), true, "wrong pending SBF");

        await farmingCenterInst.deposit(0, web3.utils.toBN("30").mul(web3.utils.toBN(1e18)), {from: player2});
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(0, player0);
        assert.equal(web3.utils.toBN(pendingSBFPlayer0).eq(web3.utils.toBN("3333333333333").mul(web3.utils.toBN(1e7))), true, "wrong pending SBF");
        pendingSBFPlayer1 = await farmingCenterInst.pendingSBF(0, player1);
        assert.equal(web3.utils.toBN(pendingSBFPlayer1).eq(web3.utils.toBN("666666666666").mul(web3.utils.toBN(1e7))), true, "wrong pending SBF");
        let pendingSBFPlayer2 = await farmingCenterInst.pendingSBF(0, player2);
        assert.equal(web3.utils.toBN(pendingSBFPlayer2).eq(web3.utils.toBN("0").mul(web3.utils.toBN(1e18))), true, "wrong pending SBF");

        let playerSBFBalancePreDeposit = await sbfInst.balanceOf(player0);
        await farmingCenterInst.deposit(0, web3.utils.toBN("0").mul(web3.utils.toBN(1e18)), {from: player0});
        let playerSBFBalanceAfterDeposit = await sbfInst.balanceOf(player0);
        assert.equal(web3.utils.toBN("34999999999990000000").mul(web3.utils.toBN(3)).div(web3.utils.toBN(10)).eq(web3.utils.toBN(playerSBFBalanceAfterDeposit).sub(web3.utils.toBN(playerSBFBalancePreDeposit))), true, "wrong sbf reward");

        let playerSBFBalancePreWithdraw = await sbfInst.balanceOf(player0);
        await farmingCenterInst.withdraw(0, web3.utils.toBN("0").mul(web3.utils.toBN(1e18)), {from: player0});
        let playerSBFBalanceAfterWithdraw = await sbfInst.balanceOf(player0);
        assert.equal(web3.utils.toBN("1666666666660000000").mul(web3.utils.toBN(3)).div(web3.utils.toBN(10)).eq(web3.utils.toBN(playerSBFBalanceAfterWithdraw).sub(web3.utils.toBN(playerSBFBalancePreWithdraw))), true, "wrong sbf reward");

        const farmRewardLockInst = await FarmRewardLock.deployed();
        const farmRewardLockInfo = await farmRewardLockInst.userLockInfos(player0);
        assert.equal(web3.utils.toBN("34999999999990000000").add(web3.utils.toBN("1666666666660000000")).mul(web3.utils.toBN(7)).div(web3.utils.toBN(10)).eq(web3.utils.toBN(farmRewardLockInfo.lockedAmount)), true, "wrong lock amount");
        assert.equal(web3.utils.toBN("0").eq(web3.utils.toBN(farmRewardLockInfo.unlockedAmount)), true, "wrong lock amount");
        assert.equal(web3.utils.toBN("0").eq(web3.utils.toBN(farmRewardLockInfo.lastUpdateHeight)), true, "wrong lastUpdateHeight");
    });
    // it('Test Deposit LBNB', async () => {
    //     deployerAccount = accounts[0];
    //     initialGov = accounts[1];
    //     govGuardian = accounts[3];
    //     bcStakingTSS = accounts[4];
    //     player0 = accounts[5];
    //     player1 = accounts[6];
    //     player2 = accounts[7];
    //     player3 = accounts[8];
    //     player4 = accounts[9];
    //
    //     const steakBankInst = await SteakBank.deployed();
    //     const lbnbInst = await LBNB.deployed();
    //     const sbfInst = await SBF.deployed();
    //
    //     await steakBankInst.stake("50000000000000000000", {from: player0, value: 502e16});
    //     await steakBankInst.stake("50000000000000000000", {from: player1, value: 502e16});
    //     await steakBankInst.stake("50000000000000000000", {from: player2, value: 502e16});
    // });
});