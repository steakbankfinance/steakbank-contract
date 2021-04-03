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

        const sbfName = await sbfInst.name();
        assert.equal(sbfName, "Steak Bank Finance", "wrong name");
        const sbfSymbol = await sbfInst.symbol();
        assert.equal(sbfSymbol, "SBF", "wrong symbol");
        const sbfDecimals = await sbfInst.decimals();
        assert.equal(sbfDecimals, "18", "wrong decimals");
        const sbfTotalSupply = await sbfInst.totalSupply();
        assert.equal(sbfTotalSupply, web3.utils.toBN(46000000).mul(web3.utils.toBN(1e18)).toString(), "wrong total supply");
        const sbfOwner = await sbfInst.getOwner();
        assert.equal(sbfOwner.toString(), FarmingCenter.address.toString(), "wrong owner");

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
        assert.equal(pendingSBFPlayer0.toString(), web3.utils.toBN("20").mul(web3.utils.toBN(1e18)).toString(), "wrong pending SBF");

        await time.advanceBlock();
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(0, player0);
        assert.equal(pendingSBFPlayer0.toString(), web3.utils.toBN("40").mul(web3.utils.toBN(1e18)).toString(), "wrong pending SBF");

        await farmingCenterInst.deposit(0, web3.utils.toBN("20").mul(web3.utils.toBN(1e18)), {from: player1});
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(0, player0);
        assert.equal(pendingSBFPlayer0.toString(), web3.utils.toBN("60").mul(web3.utils.toBN(1e18)).toString(), "wrong pending SBF");
        let pendingSBFPlayer1 = await farmingCenterInst.pendingSBF(0, player1);
        assert.equal(pendingSBFPlayer1.toString(), "0", "wrong pending SBF");

        await farmingCenterInst.deposit(0, web3.utils.toBN("30").mul(web3.utils.toBN(1e18)), {from: player2});
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(0, player0);
        assert.equal(pendingSBFPlayer0.toString(), "66666666666660000000", "wrong pending SBF");
        pendingSBFPlayer1 = await farmingCenterInst.pendingSBF(0, player1);
        assert.equal(pendingSBFPlayer1.toString(), "13333333333320000000", "wrong pending SBF");
        let pendingSBFPlayer2 = await farmingCenterInst.pendingSBF(0, player2);
        assert.equal(pendingSBFPlayer2.toString(), "0", "wrong pending SBF");

        let playerSBFBalancePreDeposit = await sbfInst.balanceOf(player0);
        await farmingCenterInst.deposit(0, "0", {from: player0});
        let playerSBFBalanceAfterDeposit = await sbfInst.balanceOf(player0);
        assert.equal("20999999999997000000", playerSBFBalanceAfterDeposit.sub(playerSBFBalancePreDeposit).toString(), "wrong sbf reward");

        let playerSBFBalancePreWithdraw = await sbfInst.balanceOf(player0);
        await farmingCenterInst.withdraw(0, "0", {from: player0});
        let playerSBFBalanceAfterWithdraw = await sbfInst.balanceOf(player0);
        assert.equal("999999999999000000", playerSBFBalanceAfterWithdraw.sub(playerSBFBalancePreWithdraw).toString(), "wrong sbf reward");

        const farmRewardLockInst = await FarmRewardLock.deployed();
        const farmRewardLockInfo = await farmRewardLockInst.userLockInfos(player0);
        assert.equal(farmRewardLockInfo.lockedAmount.toString(), "51333333333324000000","wrong lock amount");
        assert.equal(farmRewardLockInfo.unlockedAmount.toString(), "0", "wrong lock amount");
        assert.equal(farmRewardLockInfo.lastUpdateHeight.toString(), "0", "wrong lastUpdateHeight");
    });
    it('Test Deposit LBNB', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const steakBankInst = await SteakBank.deployed();
        const lbnbInst = await LBNB.deployed();
        const sbfInst = await SBF.deployed();
        const farmingCenterInst = await FarmingCenter.deployed();
        const farmRewardLockInst = await FarmRewardLock.deployed();

        await steakBankInst.stake(web3.utils.toBN("50").mul(web3.utils.toBN(1e18)), {from: player0, value: 5002e16});
        await steakBankInst.stake(web3.utils.toBN("50").mul(web3.utils.toBN(1e18)), {from: player1, value: 5002e16});
        await steakBankInst.stake(web3.utils.toBN("50").mul(web3.utils.toBN(1e18)), {from: player2, value: 5002e16});

        await lbnbInst.approve(FarmingCenter.address, web3.utils.toBN("50").mul(web3.utils.toBN(1e18)), {from: player0});
        await lbnbInst.approve(FarmingCenter.address, web3.utils.toBN("50").mul(web3.utils.toBN(1e18)), {from: player1});
        await lbnbInst.approve(FarmingCenter.address, web3.utils.toBN("50").mul(web3.utils.toBN(1e18)), {from: player2});

        await farmingCenterInst.add(1000, LBNB.address, true, 5, 10, {from: initialGov});

        let pool0Info = await farmingCenterInst.poolInfo(0)
        assert.equal(pool0Info.allocPoint, "1000", "wrong allocPoint");
        let pool1Info = await farmingCenterInst.poolInfo(1)
        assert.equal(pool1Info.allocPoint, "1000", "wrong allocPoint");

        await farmingCenterInst.deposit(1, web3.utils.toBN("10").mul(web3.utils.toBN(1e18)), {from: player0});
        let pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(1, player0);
        assert(pendingSBFPlayer0, "0", "wrong pending SBF");

        await time.advanceBlock();
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(1, player0);
        assert.equal(pendingSBFPlayer0.toString(), "10000000000000000000", true, "wrong pending SBF");

        await farmingCenterInst.deposit(1, web3.utils.toBN("10").mul(web3.utils.toBN(1e18)), {from: player1});
        await farmingCenterInst.deposit(1, web3.utils.toBN("20").mul(web3.utils.toBN(1e18)), {from: player2});

        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(1, player0);
        assert.equal(pendingSBFPlayer0.toString(), web3.utils.toBN("250").mul(web3.utils.toBN(1e17)).toString(), "wrong pending SBF");

        await time.advanceBlock();
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(1, player0);
        assert.equal(pendingSBFPlayer0.toString(), web3.utils.toBN("2750").mul(web3.utils.toBN(1e16)).toString(), "wrong pending SBF");
        let pendingSBFPlayer1 = await farmingCenterInst.pendingSBF(1, player1);
        assert.equal(pendingSBFPlayer1.toString(), web3.utils.toBN("750").mul(web3.utils.toBN(1e16)).toString(), "wrong pending SBF");
        let pendingSBFPlayer2 = await farmingCenterInst.pendingSBF(1, player2);
        assert.equal(pendingSBFPlayer2.toString(), web3.utils.toBN("500").mul(web3.utils.toBN(1e16)).toString(), "wrong pending SBF");

        const sumOfThreePlayers = pendingSBFPlayer0.add(pendingSBFPlayer1).add(pendingSBFPlayer2);

        await farmingCenterInst.set(1, 9000, true, {from: initialGov});

        pool0Info = await farmingCenterInst.poolInfo(0)
        assert.equal(pool0Info.allocPoint, "2250", "wrong allocPoint");
        pool1Info = await farmingCenterInst.poolInfo(1)
        assert.equal(pool1Info.allocPoint, "9000", "wrong allocPoint");

        await time.advanceBlock();
        pendingSBFPlayer0 = await farmingCenterInst.pendingSBF(1, player0);
        pendingSBFPlayer1 = await farmingCenterInst.pendingSBF(1, player1);
        pendingSBFPlayer2 = await farmingCenterInst.pendingSBF(1, player2);

        assert.equal(pendingSBFPlayer0.add(pendingSBFPlayer1).add(pendingSBFPlayer2).sub(sumOfThreePlayers).toString(),
            "26000000000000000000", "wrong reward");

        await farmingCenterInst.setPoolRewardLockRate(1, 2, 10, {from: initialGov})

        const farmRewardLockInfoPre = await farmRewardLockInst.userLockInfos(player0);
        let playerSBFBalancePreDeposit = await sbfInst.balanceOf(player0);

        await farmingCenterInst.deposit(1, "0", {from: player0});

        const farmRewardLockInfoAfter = await farmRewardLockInst.userLockInfos(player0);
        let playerSBFBalanceAfterDeposit = await sbfInst.balanceOf(player0);
        assert.equal(farmRewardLockInfoAfter.lockedAmount.sub(farmRewardLockInfoPre.lockedAmount).mul(web3.utils.toBN(4)).toString(),
            playerSBFBalanceAfterDeposit.sub(playerSBFBalancePreDeposit).toString(), "wrong locked amount");
    });
    it('Test Reward Lock', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const steakBankInst = await SteakBank.deployed();
        const lbnbInst = await LBNB.deployed();
        const sbfInst = await SBF.deployed();
        const farmingCenterInst = await FarmingCenter.deployed();
        const farmRewardLockInst = await FarmRewardLock.deployed();

        await time.advanceBlockTo(110);

        let farmRewardLockInfo = await farmRewardLockInst.userLockInfos(player1);
        assert.equal(farmRewardLockInfo.lockedAmount.toString(), "0", "wrong lockedAmount");
        assert.equal(farmRewardLockInfo.unlockedAmount.toString(), "0", "wrong unlockedAmount");
        assert.equal(farmRewardLockInfo.lastUpdateHeight.toString(), "0", "wrong lastUpdateHeight");

        await farmingCenterInst.deposit(1, web3.utils.toBN("0"), {from: player1});

        farmRewardLockInfo = await farmRewardLockInst.userLockInfos(player1);
        assert.equal(farmRewardLockInfo.lockedAmount.toString(), "51600000000000000000", "wrong lockedAmount");
        assert.equal(farmRewardLockInfo.unlockedAmount.toString(), "0", "wrong unlockedAmount");

        await time.advanceBlockTo(120);

        await farmingCenterInst.deposit(1, web3.utils.toBN("0"), {from: player1});

        farmRewardLockInfo = await farmRewardLockInst.userLockInfos(player1);

        assert.equal(farmRewardLockInfo.lockedAmount.toString(), "53802247191011235956", "wrong lockedAmount");
        assert.equal(farmRewardLockInfo.unlockedAmount.toString(), "5797752808988764044", "wrong unlockedAmount");

        await time.advanceBlock();

        const farmRewardUnlockInfo = await farmRewardLockInst.unlockedAmount(player1);
        assert.equal(farmRewardUnlockInfo[0].toString(), "5797752808988764044", "wrong lockedAmount");
        assert.equal(farmRewardUnlockInfo[1].toString(), "681041103683686531", "wrong newUnlockedAmount");

        const beforeClaimPlayer1Balance = await sbfInst.balanceOf(player1);
        await farmRewardLockInst.claim({from: player1});
        const afterClaimPlayer1Balance = await sbfInst.balanceOf(player1);
        assert.equal(afterClaimPlayer1Balance.sub(beforeClaimPlayer1Balance).toString(),"7159835016356137106", "wrong claim amount");
    });
    it('Test Farming End', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const steakBankInst = await SteakBank.deployed();
        const lbnbInst = await LBNB.deployed();
        const sbfInst = await SBF.deployed();
        const farmingCenterInst = await FarmingCenter.deployed();
        const farmRewardLockInst = await FarmRewardLock.deployed();

        await time.advanceBlockTo(300);

        let playerSBFBalancePreHarvest = await sbfInst.balanceOf(player0);
        await farmingCenterInst.deposit(0, "0", {from: player0});
        let playerSBFBalancePostHarvest = await sbfInst.balanceOf(player0);
        assert.equal(playerSBFBalancePostHarvest.sub(playerSBFBalancePreHarvest).toString(),"144333333333330000000", "wrong harvest amount");

        await time.advanceBlockTo(320);

        playerSBFBalancePreHarvest = await sbfInst.balanceOf(player0);
        await farmingCenterInst.deposit(0, "0", {from: player0});
        playerSBFBalancePostHarvest = await sbfInst.balanceOf(player0);
        assert.equal(playerSBFBalancePostHarvest.sub(playerSBFBalancePreHarvest).toString(),"6666666666660000000", "wrong harvest amount");

        await farmingCenterInst.deposit(0, web3.utils.toBN("0"), {from: player0});

        await time.advanceBlockTo(360);

        await farmingCenterInst.deposit(0, web3.utils.toBN("0"), {from: player0});
        await farmingCenterInst.deposit(0, web3.utils.toBN("0"), {from: player1});
        await farmingCenterInst.deposit(0, web3.utils.toBN("0"), {from: player2});
        await farmingCenterInst.deposit(1, web3.utils.toBN("0"), {from: player0});
        await farmingCenterInst.deposit(1, web3.utils.toBN("0"), {from: player1});
        await farmingCenterInst.deposit(1, web3.utils.toBN("0"), {from: player2});

        const sbfTotalSupply = await sbfInst.totalSupply();
        assert.equal(sbfTotalSupply.sub(web3.utils.toBN(46000000).mul(web3.utils.toBN(1e18))).toString(), "4189999999999840000000", "wrong sbf total supply"); //approximately 10 * 100 *2 + 10 *（320 - 100）= 4200

        await farmingCenterInst.deposit(0, web3.utils.toBN("0"), {from: player0});
        await farmingCenterInst.deposit(0, web3.utils.toBN("0"), {from: player1});
        await farmingCenterInst.deposit(0, web3.utils.toBN("0"), {from: player2});
        await farmingCenterInst.deposit(1, web3.utils.toBN("0"), {from: player0});
        await farmingCenterInst.deposit(1, web3.utils.toBN("0"), {from: player1});
        await farmingCenterInst.deposit(1, web3.utils.toBN("0"), {from: player2});

        const newSBFTotalSupply = await sbfInst.totalSupply();
        assert.equal(newSBFTotalSupply.toString(), sbfTotalSupply.toString(), "wrong sbf total supply"); // no new sbf will be mint

        let beforeEmergencyWithdrawAmountPlayer0 = await sbfInst.balanceOf(player0);
        let beforeEmergencyWithdrawAmountPlayer1 = await sbfInst.balanceOf(player1);
        let beforeEmergencyWithdrawAmountPlayer2 = await sbfInst.balanceOf(player2);

        await farmingCenterInst.emergencyWithdraw(0, {from: player0});
        await farmingCenterInst.emergencyWithdraw(0, {from: player1});
        await farmingCenterInst.emergencyWithdraw(0, {from: player2});

        let afterEmergencyWithdrawAmountPlayer0 = await sbfInst.balanceOf(player0);
        let afterEmergencyWithdrawAmountPlayer1 = await sbfInst.balanceOf(player1);
        let afterEmergencyWithdrawAmountPlayer2 = await sbfInst.balanceOf(player2);

        assert.equal(afterEmergencyWithdrawAmountPlayer0.sub(beforeEmergencyWithdrawAmountPlayer0).toString(), "10000000000000000000", "wrong sbf balance change");
        assert.equal(afterEmergencyWithdrawAmountPlayer1.sub(beforeEmergencyWithdrawAmountPlayer1).toString(), "20000000000000000000", "wrong sbf balance change");
        assert.equal(afterEmergencyWithdrawAmountPlayer2.sub(beforeEmergencyWithdrawAmountPlayer2).toString(), "30000000000000000000", "wrong sbf balance change");

        beforeEmergencyWithdrawAmountPlayer0 = await lbnbInst.balanceOf(player0);
        beforeEmergencyWithdrawAmountPlayer1 = await lbnbInst.balanceOf(player1);
        beforeEmergencyWithdrawAmountPlayer2 = await lbnbInst.balanceOf(player2);

        await farmingCenterInst.emergencyWithdraw(1, {from: player0});
        await farmingCenterInst.emergencyWithdraw(1, {from: player1});
        await farmingCenterInst.emergencyWithdraw(1, {from: player2});

        afterEmergencyWithdrawAmountPlayer0 = await lbnbInst.balanceOf(player0);
        afterEmergencyWithdrawAmountPlayer1 = await lbnbInst.balanceOf(player1);
        afterEmergencyWithdrawAmountPlayer2 = await lbnbInst.balanceOf(player2);

        assert.equal(afterEmergencyWithdrawAmountPlayer0.sub(beforeEmergencyWithdrawAmountPlayer0).toString(), "10000000000000000000", "wrong lbnb balance change");
        assert.equal(afterEmergencyWithdrawAmountPlayer1.sub(beforeEmergencyWithdrawAmountPlayer1).toString(), "10000000000000000000", "wrong lbnb balance change");
        assert.equal(afterEmergencyWithdrawAmountPlayer2.sub(beforeEmergencyWithdrawAmountPlayer2).toString(), "20000000000000000000", "wrong lbnb balance change");

    });
});