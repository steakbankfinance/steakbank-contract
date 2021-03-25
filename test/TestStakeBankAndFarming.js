const LBNB = artifacts.require("LBNB");
const SBF = artifacts.require("SBF");

const UnstakeVault = artifacts.require("UnstakeVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");

const StakeBank = artifacts.require("StakeBankImpl");

const FarmRewardLock = artifacts.require("FarmRewardLock");
const FarmingCenter = artifacts.require("FarmingCenter");

const Governor = artifacts.require("Governor");
const Timelock = artifacts.require("Timelock");

const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

contract('StakeBank Contract', (accounts) => {
    it('Stake', async () => {
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const stakeBankInst = await StakeBank.deployed();
        const lbnbInst = await LBNB.deployed();

        const relayerFee = web3.utils.toBN(2e16);

        const tssInitialBalance = await web3.eth.getBalance(bcStakingTSS);

        let stakeTx0 = await stakeBankInst.stake("1000000000000000000", {from: player0, value: 102e16});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.bnbAmount.toString() === "999000000000000000";
        });
        const player0LBNBBalance = await lbnbInst.balanceOf(player0);
        assert.equal(player0LBNBBalance.toString(), "999000000000000000", "wrong lbnb balance");
        const tssBalance0 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN(tssInitialBalance).add(web3.utils.toBN("999000000000000000")).add(relayerFee).eq(web3.utils.toBN(tssBalance0)), true, "wrong bnb balance");
        const communityTaxVaultBalance0 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("1000000000000000").eq(web3.utils.toBN(communityTaxVaultBalance0)), true, "wrong bnb balance");

        let stakeTx1 = await stakeBankInst.stake("2000000000000000000", {from: player1, value: 202e16});
        truffleAssert.eventEmitted(stakeTx1, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player1.toLowerCase() && ev.bnbAmount.toString() === "1998000000000000000";
        });
        const tssBalance1 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("1998000000000000000").add(relayerFee).add(web3.utils.toBN(tssBalance0)).eq(web3.utils.toBN(tssBalance1)), true, "wrong bnb balance");
        const communityTaxVaultBalance1 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("3000000000000000").eq(web3.utils.toBN(communityTaxVaultBalance1)), true, "wrong bnb balance");

        const player1LBNBBalance = await lbnbInst.balanceOf(player1);
        assert.equal(player1LBNBBalance.toString(), "1998000000000000000", "wrong lbnb balance");

        let lbnbTotalSupply = await lbnbInst.totalSupply();
        assert.equal(lbnbTotalSupply, "2997000000000000000", "wrong lbnb balance");

        let stakeTx2 = await stakeBankInst.stake("2500000000000000000", {from: player2, value: 252e16});
        truffleAssert.eventEmitted(stakeTx2, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player2.toLowerCase() && ev.bnbAmount.toString() === "2497500000000000000";
        });
        const tssBalance2 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("2497500000000000000").add(relayerFee).add(web3.utils.toBN(tssBalance1)).eq(web3.utils.toBN(tssBalance2)), true, "wrong bnb balance");
        const communityTaxVaultBalance2 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("5500000000000000").eq(web3.utils.toBN(communityTaxVaultBalance2)), true, "wrong bnb balance");

        let stakeTx3 = await stakeBankInst.stake("3000000000000000000", {from: player3, value: 302e16});
        truffleAssert.eventEmitted(stakeTx3, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player3.toLowerCase() && ev.bnbAmount.toString() === "2997000000000000000";
        });
        const tssBalance3 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("2997000000000000000").add(relayerFee).add(web3.utils.toBN(tssBalance2)).eq(web3.utils.toBN(tssBalance3)), true, "wrong bnb balance");
        const communityTaxVaultBalance3 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("8500000000000000").eq(web3.utils.toBN(communityTaxVaultBalance3)), true, "wrong bnb balance");

        let stakeTx4 = await stakeBankInst.stake("3500000000000000000", {from: player4, value: 352e16});
        truffleAssert.eventEmitted(stakeTx4, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player4.toLowerCase() && ev.bnbAmount.toString() === "3496500000000000000";
        });
        const tssBalance4 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("3496500000000000000").add(relayerFee).add(web3.utils.toBN(tssBalance3)).eq(web3.utils.toBN(tssBalance4)), true, "wrong bnb balance");
        const communityTaxVaultBalance4 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("12000000000000000").eq(web3.utils.toBN(communityTaxVaultBalance4)), true, "wrong bnb balance");

        const lbnbMarketCapacityCountByBNB = await stakeBankInst.lbnbMarketCapacityCountByBNB();
        assert.equal(web3.utils.toBN("11988000000000000000").eq(web3.utils.toBN(lbnbMarketCapacityCountByBNB)), true, "wrong lbnbMarketCapacityCountByBNB");

        const lbnbToBNBExchangeRate = await stakeBankInst.lbnbToBNBExchangeRate();
        assert.equal(web3.utils.toBN(1e9).eq(web3.utils.toBN(lbnbToBNBExchangeRate)), true, "wrong lbnbToBNBExchangeRate");

        lbnbTotalSupply = await lbnbInst.totalSupply();
        assert.equal(web3.utils.toBN("11988000000000000000").eq(web3.utils.toBN(lbnbTotalSupply)), true, "wrong lbnb totalSupply");
    });

    it('Unstake', async () => {
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const stakeBankInst = await StakeBank.deployed();
        const lbnbInst = await LBNB.deployed();

        await lbnbInst.approve(StakeBank.address, web3.utils.toBN("999000000000000000"), {from: player0})
        const allowance = await lbnbInst.allowance(player0, StakeBank.address);
        assert.equal(web3.utils.toBN("999000000000000000").eq(web3.utils.toBN(allowance)), true, "wrong allowance");

        let unstakeTx0 = await stakeBankInst.unstake(web3.utils.toBN("999000000000000000"), {from: player0});
        truffleAssert.eventEmitted(unstakeTx0, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.bnbAmount.toString() === "998001000000000000" && ev.index.toNumber() === 0;
        });

        const lbnbTotalSupply = await lbnbInst.totalSupply();
        assert.equal(web3.utils.toBN("10989999000000000000").eq(web3.utils.toBN(lbnbTotalSupply)), true, "wrong lbnb totalSupply");

        const lbnbMarketCapacityCountByBNB = await stakeBankInst.lbnbMarketCapacityCountByBNB();
        assert.equal(web3.utils.toBN("10989999000000000000").eq(web3.utils.toBN(lbnbMarketCapacityCountByBNB)), true, "wrong lbnbMarketCapacityCountByBNB");
        const lbnbToBNBExchangeRate = await stakeBankInst.lbnbToBNBExchangeRate();
        assert.equal(web3.utils.toBN(1e9).eq(web3.utils.toBN(lbnbToBNBExchangeRate)), true, "wrong lbnbToBNBExchangeRate");

        const communityTaxVaultLBNBBalance0 = await lbnbInst.balanceOf(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("999000000000000").eq(web3.utils.toBN(communityTaxVaultLBNBBalance0)), true, "wrong lbnb balance");

        const balanceOfPlayer0 = await lbnbInst.balanceOf(player0);
        assert.equal(web3.utils.toBN(0).eq(web3.utils.toBN(balanceOfPlayer0)), true, "wrong lbnb balance");

        const tailIdx = await stakeBankInst.tailIdx();
        assert.equal(web3.utils.toBN(1).eq(web3.utils.toBN(tailIdx)), true, "wrong tailIdx");

        const headerIdx = await stakeBankInst.headerIdx();
        assert.equal(web3.utils.toBN(0).eq(web3.utils.toBN(headerIdx)), true, "wrong headerIdx");

        let isUnstakeClaimable = await stakeBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        const transferToUnstakeVaultTx = await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN(998001000000000000), chainId: 666})
        // truffleAssert.eventEmitted(transferToUnstakeVaultTx, "Deposit", (ev) => {
        //     return ev.from.toLowerCase() === bcStakingTSS.toLowerCase() && ev.amount.toNumber() === 1e18;
        // });
        const unstakeVaultBalance = await web3.eth.getBalance(UnstakeVault.address)
        assert.equal(web3.utils.toBN("998001000000000000").eq(web3.utils.toBN(unstakeVaultBalance)), true, "wrong unstakeVaultBalance");

        isUnstakeClaimable = await stakeBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");

        const beforeClaimUnstake = await web3.eth.getBalance(player0);
        await stakeBankInst.batchClaimPendingUnstake(1, { from: bcStakingTSS});
        const afterClaimUnstake = await web3.eth.getBalance(player0);
        assert.equal(web3.utils.toBN(afterClaimUnstake).sub(web3.utils.toBN(beforeClaimUnstake)).eq(web3.utils.toBN("998001000000000000")), true, "wrong claimed unstake amount");
    });
    it('Add staking reward', async () => {
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const stakeBankInst = await StakeBank.deployed();
        const lbnbInst = await LBNB.deployed();

        await web3.eth.sendTransaction({ from: bcStakingTSS, to: StakingRewardVault.address, value: web3.utils.toBN(1e18), chainId: 666})

        const lbnbMarketCapacityCountByBNB = await stakeBankInst.lbnbMarketCapacityCountByBNB();
        assert.equal(web3.utils.toBN("10989999000000000000").eq(web3.utils.toBN(lbnbMarketCapacityCountByBNB)), true, "wrong lbnbMarketCapacityCountByBNB");
        const lbnbToBNBExchangeRate = await stakeBankInst.lbnbToBNBExchangeRate();
        assert.equal(web3.utils.toBN(1e9).eq(web3.utils.toBN(lbnbToBNBExchangeRate)), true, "wrong lbnbToBNBExchangeRate");

        const rebaseLBNBToBNBTx = await stakeBankInst.rebaseLBNBToBNB({from: bcStakingTSS})
        truffleAssert.eventEmitted(rebaseLBNBToBNBTx, "LogUpdateLBNBToBNBExchangeRate", (ev) => {
            return ev.LBNBTotalSupply.toString() === "10989999000000000000" && ev.LBNBMarketCapacityCountByBNB.toString() === "11989999000000000000" && ev.LBNBToBNBExchangeRate.toString() === "1090991819";
        });

        let stakeTx0 = await stakeBankInst.stake("1000000000000000000", {from: player0, value: 102e16});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.lbnbAmount.toString() === "915680560204090769" && ev.bnbAmount.toString() === "999000000000000000";
        });
        const player0LBNBBalance = await lbnbInst.balanceOf(player0);
        assert.equal(player0LBNBBalance.toString(), "915680560204090769", "wrong lbnb balance");

        await lbnbInst.approve(StakeBank.address, web3.utils.toBN("1998000000000000000"), {from: player1})
        let unstakeTx0 = await stakeBankInst.unstake(web3.utils.toBN("1998000000000000000"), {from: player1});
        truffleAssert.eventEmitted(unstakeTx0, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player1.toLowerCase() && ev.lbnbAmount.toString() === "1996002000000000000" && ev.bnbAmount.toString() === "2177621850000000000" && ev.index.toNumber() === 1;
        });

        await lbnbInst.approve(StakeBank.address, web3.utils.toBN("2497500000000000000"), {from: player2})
        let unstakeTx1 = await stakeBankInst.unstake(web3.utils.toBN("2497500000000000000"), {from: player2});
        truffleAssert.eventEmitted(unstakeTx1, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player2.toLowerCase() && ev.lbnbAmount.toString() === "2495002500000000000" && ev.bnbAmount.toString() === "2722027310000000000" && ev.index.toNumber() === 2;
        });

        const headerIdx = await stakeBankInst.headerIdx();
        assert.equal(headerIdx.toNumber(), 1, "wrong headerIdx");
        const tailIdx = await stakeBankInst.tailIdx();
        assert.equal(tailIdx.toNumber(), 3, "wrong tailIdx");

        let isUnstakeClaimable = await stakeBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await stakeBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN("3899649160000000000"), chainId: 666})

        const unstakeVaultBalance = await web3.eth.getBalance(UnstakeVault.address)
        assert.equal(web3.utils.toBN("4899649160000000000").eq(web3.utils.toBN(unstakeVaultBalance)), true, "wrong unstakeVaultBalance");

        isUnstakeClaimable = await stakeBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await stakeBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(1)));
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");

        const beforeClaimUnstakePlayer1 = await web3.eth.getBalance(player1);
        const beforeClaimUnstakePlayer2 = await web3.eth.getBalance(player2);
        await stakeBankInst.batchClaimPendingUnstake(2, { from: bcStakingTSS});
        const afterClaimUnstakePlayer1 = await web3.eth.getBalance(player1);
        const afterClaimUnstakePlayer2 = await web3.eth.getBalance(player2);
        assert.equal(web3.utils.toBN(afterClaimUnstakePlayer1).sub(web3.utils.toBN(beforeClaimUnstakePlayer1)).eq(web3.utils.toBN("2177621850000000000")), true, "wrong claimed unstake amount");
        assert.equal(web3.utils.toBN(afterClaimUnstakePlayer2).sub(web3.utils.toBN(beforeClaimUnstakePlayer2)).eq(web3.utils.toBN("2722027310000000000")), true, "wrong claimed unstake amount");
    });
});