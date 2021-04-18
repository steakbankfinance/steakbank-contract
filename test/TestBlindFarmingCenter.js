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

const Governor = artifacts.require("Governor");
const Timelock = artifacts.require("Timelock");

const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const tokenPrecision = web3.utils.toBN("1000000000000000000")

contract('BlindFarmingCenter Contract', (accounts) => {
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

        const steakBankInst = await SteakBank.deployed();
        const lbnbInst = await LBNB.deployed();
        const sbfInst = await SBF.deployed();
        const blindFarmingCenterInst = await BlindFarmingCenter.deployed();

        await blindFarmingCenterInst.add(1000, LBNB.address, false, {from: initialGov});

        await sbfInst.approve(BlindFarmingCenter.address, web3.utils.toBN("100000000").mul(tokenPrecision),{from: initialGov});

        const currentHeight =  await time.latestBlock()
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
});
