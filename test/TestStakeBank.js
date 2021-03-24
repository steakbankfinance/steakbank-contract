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

        const tssInitialBalance = await web3.eth.getBalance(bcStakingTSS);

        let stakeTx0 = await stakeBankInst.stakeBNB("1000000000000000000", {from: player0, value: 102e16});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.amount.toNumber() === 100000000;
        });
        const player0LBNBBalance = await lbnbInst.balanceOf(player0);
        assert.equal(player0LBNBBalance.toNumber(), 100000000, "wrong lbnb balance");
        const tssBalance0 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("1000000000000000000").add(web3.utils.toBN(tssInitialBalance)).eq(web3.utils.toBN(tssBalance0)), true, "wrong bnb balance");

        let stakeTx1 = await stakeBankInst.stakeBNB("2000000000000000000", {from: player1, value: 202e16});
        truffleAssert.eventEmitted(stakeTx1, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player1.toLowerCase() && ev.amount.toNumber() === 200000000;
        });
        const tssBalance1 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("2000000000000000000").add(web3.utils.toBN(tssBalance0)).eq(web3.utils.toBN(tssBalance1)), true, "wrong bnb balance");

        const player1LBNBBalance = await lbnbInst.balanceOf(player1);
        assert.equal(player1LBNBBalance.toNumber(), 200000000, "wrong lbnb balance");

        const lbnbTotalSupply = await lbnbInst.totalSupply();
        assert.equal(lbnbTotalSupply.toNumber(), 300000000, "wrong lbnb balance");

        let stakeTx2 = await stakeBankInst.stakeBNB("2500000000000000000", {from: player2, value: 252e16});
        truffleAssert.eventEmitted(stakeTx2, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player2.toLowerCase() && ev.amount.toNumber() === 250000000;
        });
        const tssBalance2 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("2500000000000000000").add(web3.utils.toBN(tssBalance1)).eq(web3.utils.toBN(tssBalance2)), true, "wrong bnb balance");

        let stakeTx3 = await stakeBankInst.stakeBNB("3000000000000000000", {from: player3, value: 302e16});
        truffleAssert.eventEmitted(stakeTx3, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player3.toLowerCase() && ev.amount.toNumber() === 300000000;
        });
        const tssBalance3 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("3000000000000000000").add(web3.utils.toBN(tssBalance2)).eq(web3.utils.toBN(tssBalance3)), true, "wrong bnb balance");

        let stakeTx4 = await stakeBankInst.stakeBNB("3500000000000000000", {from: player4, value: 352e16});
        truffleAssert.eventEmitted(stakeTx4, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player4.toLowerCase() && ev.amount.toNumber() === 350000000;
        });
        const tssBalance4 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("3500000000000000000").add(web3.utils.toBN(tssBalance3)).eq(web3.utils.toBN(tssBalance4)), true, "wrong bnb balance");
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

        await lbnbInst.approve(StakeBank.address, web3.utils.toBN(1e18), {from: player0})
        const allowance = await lbnbInst.allowance(player0, StakeBank.address);
        assert.equal(web3.utils.toBN(1e18).eq(web3.utils.toBN(allowance)), true, "wrong allowance");

        let unstakeTx0 = await stakeBankInst.unstakeBNB(web3.utils.toBN(1e8), {from: player0});
        truffleAssert.eventEmitted(unstakeTx0, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.amount.toNumber() === 1e8 && ev.index.toNumber() === 0;
        });

        const balanceOfPlayer0 = await lbnbInst.balanceOf(player0);
        assert.equal(web3.utils.toBN(0).eq(web3.utils.toBN(balanceOfPlayer0)), true, "wrong lbnb balance");

        const tailIdx = await stakeBankInst.tailIdx();
        assert.equal(web3.utils.toBN(1).eq(web3.utils.toBN(tailIdx)), true, "wrong tailIdx");

        const headerIdx = await stakeBankInst.headerIdx();
        assert.equal(web3.utils.toBN(0).eq(web3.utils.toBN(headerIdx)), true, "wrong headerIdx");

        let isUnstakeMature = await stakeBankInst.isUnstakeMature(headerIdx);
        assert.equal(isUnstakeMature, false, "wrong isUnstakeMature");

        const transferToUnstakeVaultTx = await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN(1e18), chainId: 666})
        // truffleAssert.eventEmitted(transferToUnstakeVaultTx, "Deposit", (ev) => {
        //     return ev.from.toLowerCase() === bcStakingTSS.toLowerCase() && ev.amount.toNumber() === 1e18;
        // });
        const unstakeVaultBalance = await web3.eth.getBalance(UnstakeVault.address)
        assert.equal(web3.utils.toBN(1e18).eq(web3.utils.toBN(unstakeVaultBalance)), true, "wrong unstakeVaultBalance");

        isUnstakeMature = await stakeBankInst.isUnstakeMature(headerIdx);
        assert.equal(isUnstakeMature, true, "wrong isUnstakeMature");

        const beforeClaimUnstake = await web3.eth.getBalance(player0);
        await stakeBankInst.batchClaimUnstakedBNB(1, { from: bcStakingTSS});
        const afterClaimUnstake = await web3.eth.getBalance(player0);
        assert.equal(web3.utils.toBN(afterClaimUnstake).sub(web3.utils.toBN(beforeClaimUnstake)).eq(web3.utils.toBN(1e18)), true, "wrong mature unstake amount");
    });
});