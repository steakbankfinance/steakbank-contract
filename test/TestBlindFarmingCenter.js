const { expectRevert, time } = require('@openzeppelin/test-helpers');

const LBNB = artifacts.require("LBNB");
const SBF = artifacts.require("SBF");

const UnstakeVault = artifacts.require("UnstakeVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");

const SteakBank = artifacts.require("SteakBankImpl");

const FarmRewardLock = artifacts.require("FarmRewardLock");
const FarmingCenter = artifacts.require("FarmingCenter");
const BlindFarmingCenter = artifacts.require("BlindFarmingCenter");
const MockLPToken = artifacts.require("MockLPToken");

const Governor = artifacts.require("Governor");
const Timelock = artifacts.require("Timelock");

const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const tokenPrecision = web3.utils.toBN("1000000000000000000")

contract('BlindFarmingCenter Contract', (accounts) => {
    it('Test Deposit LBNB to BlindFarmingCenter', async () => {
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
        const blindFarmingCenterInst = await BlindFarmingCenter.deployed();

        const releaseHeight = await blindFarmingCenterInst.releaseHeight();
        const sbfPerBlock = await blindFarmingCenterInst.sbfPerBlock();
        const startBlock = await blindFarmingCenterInst.startBlock();
        const endBlock = await blindFarmingCenterInst.endBlock();
        assert.equal(releaseHeight.toString(), "115792089237316195423570985008687907853269984665640564039457584007913129639935", "wrong releaseHeight")
        assert.equal(sbfPerBlock.toString(), "0", "wrong sbfPerBlock")
        assert.equal(startBlock.toString(), "0", "wrong startBlock")
        assert.equal(endBlock.toString(), "0", "wrong endBlock")

        await blindFarmingCenterInst.add(1000, LBNB.address, false, {from: initialGov});

        await sbfInst.approve(BlindFarmingCenter.address, web3.utils.toBN("100000000").mul(tokenPrecision),{from: initialGov});

        const currentHeight =  await time.latestBlock();
        await blindFarmingCenterInst.startBindFarming(web3.utils.toBN("10").mul(tokenPrecision),
            currentHeight.add(web3.utils.toBN("10")), web3.utils.toBN("20"),{from: initialGov});

        const totalAllocPoint = await blindFarmingCenterInst.totalAllocPoint();
        assert.equal(totalAllocPoint.toString(), "1000", "wrong totalAllocPoint");
        let firstPoolInfo = await blindFarmingCenterInst.poolInfo(0);
        assert.equal(firstPoolInfo.allocPoint.toString(), "1000", "wrong pool allocPoint");
        assert.equal(firstPoolInfo.lastRewardBlock.toString(), currentHeight.add(web3.utils.toBN("10")).toString(), "wrong pool lastRewardBlock");

        const sbfBalance = await sbfInst.balanceOf(BlindFarmingCenter.address);
        assert.equal(sbfBalance.toString(), web3.utils.toBN(200).mul(tokenPrecision).toString(), "wrong sbf balance");

        await steakBankInst.stake(web3.utils.toBN(10).mul(tokenPrecision).toString(), {from: player0, value: 1002e16});
        await lbnbInst.approve(BlindFarmingCenter.address, web3.utils.toBN("10").mul(tokenPrecision),{from: player0});

        let depositTx = await blindFarmingCenterInst.deposit(web3.utils.toBN(0), web3.utils.toBN("1").mul(tokenPrecision),{from: player0});
        truffleAssert.eventEmitted(depositTx, "Deposit",(ev) => {
            return ev.amount.toString() === web3.utils.toBN("1").mul(tokenPrecision).toString() && ev.reward.toString() === "0";
        });

        await time.advanceBlockTo(currentHeight.add(web3.utils.toBN("10")));
        let player0PendingReward = await blindFarmingCenterInst.pendingSBF(web3.utils.toBN(0), player0);
        assert.equal(player0PendingReward.toString(), "0", "wrong pending reward");

        await time.advanceBlock();
        player0PendingReward = await blindFarmingCenterInst.pendingSBF(web3.utils.toBN(0), player0);
        assert.equal(player0PendingReward.toString(), web3.utils.toBN("10").mul(tokenPrecision).toString(), "wrong pending reward");

        const nowHeight =  await time.latestBlock()
        const getMultiplier = await blindFarmingCenterInst.getMultiplier(firstPoolInfo.lastRewardBlock, nowHeight.add(web3.utils.toBN(1)));
        assert.equal(getMultiplier.toString(), "2", "wrong multiplier");

        depositTx = await blindFarmingCenterInst.deposit(web3.utils.toBN(0), web3.utils.toBN("0"),{from: player0});
        truffleAssert.eventEmitted(depositTx, "LockedReward",(ev) => {
            return ev.reward.toString() === web3.utils.toBN("20").mul(tokenPrecision).toString();
        });

        player0PendingReward = await blindFarmingCenterInst.pendingSBF(web3.utils.toBN(0), player0);
        assert.equal(player0PendingReward.toString(), web3.utils.toBN("0").mul(tokenPrecision).toString(), "wrong pending reward");

        try {
            await blindFarmingCenterInst.claimReward({from: player0})
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("release height is not reached"));
        }

        await blindFarmingCenterInst.setReleaseHeight(currentHeight.add(web3.utils.toBN("30")), {from: initialGov});

        await time.advanceBlockTo(currentHeight.add(web3.utils.toBN("31")));
        player0PendingReward = await blindFarmingCenterInst.pendingSBF(web3.utils.toBN(0), player0);
        assert.equal(player0PendingReward.toString(), web3.utils.toBN("180").mul(tokenPrecision).toString(), "wrong pending reward");

        let player0LBNBBalance = await lbnbInst.balanceOf(player0);
        assert.equal(player0LBNBBalance.toString(), "8990000000000000000", "wrong lbnb reward");

        const withdrawTx = await blindFarmingCenterInst.withdraw(web3.utils.toBN(0), web3.utils.toBN("1").mul(tokenPrecision),{from: player0});
        truffleAssert.eventEmitted(withdrawTx, "Withdraw",(ev) => {
            return ev.amount.toString() === web3.utils.toBN("1").mul(tokenPrecision).toString() && ev.reward.toString() === web3.utils.toBN("180").mul(tokenPrecision).toString();
        });

        let player0SBFBalance = await sbfInst.balanceOf(player0);
        assert.equal(player0SBFBalance.toString(), web3.utils.toBN("180").mul(tokenPrecision).toString(), "wrong sbf reward");
        player0LBNBBalance = await lbnbInst.balanceOf(player0);
        assert.equal(player0LBNBBalance.toString(), "9990000000000000000", "wrong lbnb reward");


        await blindFarmingCenterInst.claimReward({from: player0})
        player0SBFBalance = await sbfInst.balanceOf(player0);
        assert.equal(player0SBFBalance.toString(), web3.utils.toBN("200").mul(tokenPrecision).toString(), "wrong sbf reward");
    });
    it('Test Deposit LBNB to BlindFarmingCenter', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        govGuardian = accounts[3];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const mockLPTokenInst = await MockLPToken.deployed();
        const sbfInst = await SBF.deployed();
        const blindFarmingCenterInst = await BlindFarmingCenter.deployed();

        const player0InitialSBFBalance = await sbfInst.balanceOf(player0);
        const player1InitialSBFBalance = await sbfInst.balanceOf(player1);
        const govInitialSBFBalance = await sbfInst.balanceOf(initialGov);

        await blindFarmingCenterInst.add(1000, MockLPToken.address, false, {from: initialGov});

        const poolLength = await blindFarmingCenterInst.poolLength();
        assert.equal(poolLength.toString(), "2", "wrong poolLength");

        const currentHeight =  await time.latestBlock();
        try {
            await blindFarmingCenterInst.startBindFarming(web3.utils.toBN("10").mul(tokenPrecision),
                currentHeight.add(web3.utils.toBN("10")), web3.utils.toBN("20"),{from: initialGov});
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes("farming endHeight must be less than releaseHeight"));
        }

        await blindFarmingCenterInst.setReleaseHeight(currentHeight.add(web3.utils.toBN("10000")), {from: initialGov});
        await blindFarmingCenterInst.startBindFarming(web3.utils.toBN("10").mul(tokenPrecision),
            currentHeight.add(web3.utils.toBN("10")), web3.utils.toBN("20"),{from: initialGov});

        await mockLPTokenInst.transfer(player1, web3.utils.toBN(10000).mul(tokenPrecision),{from: initialGov});
        await mockLPTokenInst.approve(BlindFarmingCenter.address, web3.utils.toBN(10000).mul(tokenPrecision), {from: player1});

        let depositPlayer0Tx = await blindFarmingCenterInst.deposit(web3.utils.toBN(0), web3.utils.toBN("1").mul(tokenPrecision),{from: player0});
        truffleAssert.eventEmitted(depositPlayer0Tx, "Deposit",(ev) => {
            return ev.amount.toString() === web3.utils.toBN("1").mul(tokenPrecision).toString() && ev.reward.toString() === "0";
        });

        let depositPlayer1Tx = await blindFarmingCenterInst.deposit(web3.utils.toBN(1), web3.utils.toBN("100").mul(tokenPrecision),{from: player1});
        truffleAssert.eventEmitted(depositPlayer1Tx, "Deposit",(ev) => {
            return ev.amount.toString() === web3.utils.toBN("100").mul(tokenPrecision).toString() && ev.reward.toString() === "0";
        });

        await time.advanceBlockTo(currentHeight.add(web3.utils.toBN("10")));

        let player0PendingReward = await blindFarmingCenterInst.pendingSBF(0, player0);
        let player1PendingReward = await blindFarmingCenterInst.pendingSBF(1, player1);
        assert.equal(player0PendingReward.toString(), "0", "wrong player0PendingReward");
        assert.equal(player1PendingReward.toString(), "0", "wrong player1PendingReward");

        await time.advanceBlock();

        player0PendingReward = await blindFarmingCenterInst.pendingSBF(0, player0);
        player1PendingReward = await blindFarmingCenterInst.pendingSBF(1, player1);
        assert.equal(player0PendingReward.toString(), "5000000000000000000", "wrong player0PendingReward");
        assert.equal(player1PendingReward.toString(), "5000000000000000000", "wrong player1PendingReward");

        await blindFarmingCenterInst.deposit(0, 0,{from: player0});
        await blindFarmingCenterInst.deposit(1, 0,{from: player1});

        const player0LockedReward = await blindFarmingCenterInst.userLockedRewardAmount(player0);
        const player1LockedReward = await blindFarmingCenterInst.userLockedRewardAmount(player1);
        assert.equal(player0LockedReward.toString(), "10000000000000000000", "wrong player0PendingReward");
        assert.equal(player1LockedReward.toString(), "15000000000000000000", "wrong player1PendingReward");

        await blindFarmingCenterInst.increaseBlindFarmingReward(web3.utils.toBN("10").mul(tokenPrecision), {from: initialGov});
        const sbfPerBlock = await blindFarmingCenterInst.sbfPerBlock();
        assert.equal(sbfPerBlock.toString(), "20000000000000000000", "wrong sbfPerBlock");
        await blindFarmingCenterInst.deposit(0, 0,{from: player0});
        await blindFarmingCenterInst.deposit(1, 0,{from: player1});

        await time.advanceBlock();

        player0PendingReward = await blindFarmingCenterInst.pendingSBF(0, player0);
        player1PendingReward = await blindFarmingCenterInst.pendingSBF(1, player1);
        assert.equal(player0PendingReward.toString(), "20000000000000000000", "wrong player0PendingReward");
        assert.equal(player1PendingReward.toString(), "10000000000000000000", "wrong player1PendingReward");


        const sbfBalanceBefore = await sbfInst.balanceOf(BlindFarmingCenter.address);
        await blindFarmingCenterInst.increaseBlindFarmingPeriod(web3.utils.toBN("10"), {from: initialGov});
        const sbfBalanceAfter = await sbfInst.balanceOf(BlindFarmingCenter.address);
        const endBlock = await blindFarmingCenterInst.endBlock();
        assert.equal(endBlock.toString(), currentHeight.add(web3.utils.toBN("40")).toString(), "wrong endBlock");
        assert.equal(sbfBalanceAfter.sub(sbfBalanceBefore), "200000000000000000000", "wrong sbf balance change");

        await time.advanceBlockTo(currentHeight.add(web3.utils.toBN("40")));
        await blindFarmingCenterInst.withdraw(0, 0,{from: player0});
        await blindFarmingCenterInst.withdraw(1, 0,{from: player1});

        await blindFarmingCenterInst.setReleaseHeight(currentHeight.add(web3.utils.toBN("45")), {from: initialGov});
        await time.advanceBlockTo(currentHeight.add(web3.utils.toBN("45")));

        await blindFarmingCenterInst.claimReward({from: player0})
        await blindFarmingCenterInst.claimReward({from: player1})

        const player0FinalSBFBalance = await sbfInst.balanceOf(player0);
        const player1FinalSBFBalance = await sbfInst.balanceOf(player1);
        const govFinalSBFBalance = await sbfInst.balanceOf(initialGov);
        assert.equal(player0FinalSBFBalance.add(player1FinalSBFBalance).sub(player0InitialSBFBalance.add(player1InitialSBFBalance)).toString(),
            govInitialSBFBalance.sub(govFinalSBFBalance).toString(), "wrong total sbf reward");
    });
});
