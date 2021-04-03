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

contract('SteakBank Contract', (accounts) => {
    it('Test Stake', async () => {
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const steakBankInst = await SteakBank.deployed();
        const lbnbInst = await LBNB.deployed();

        const lbnbName = await lbnbInst.name();
        assert.equal(lbnbName, "Liquidity Staked BNB", "wrong name");
        const lbnbSymbol = await lbnbInst.symbol();
        assert.equal(lbnbSymbol, "LBNB", "wrong symbol");
        const lbnbDecimals = await lbnbInst.decimals();
        assert.equal(lbnbDecimals, "18", "wrong decimals");
        const totalSupply = await lbnbInst.totalSupply();
        assert.equal(totalSupply.toString(), "0", "wrong total supply");
        const lbnbOwner = await lbnbInst.getOwner();
        assert.equal(lbnbOwner.toString(), SteakBank.address, "wrong owner");

        const relayerFee = web3.utils.toBN(2e16);

        const tssInitialBalance = await web3.eth.getBalance(bcStakingTSS);

        let stakeTx0 = await steakBankInst.stake("1000000000000000000", {from: player0, value: 102e16});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.bnbAmount.toString() === "999000000000000000";
        });
        const player0LBNBBalance = await lbnbInst.balanceOf(player0);
        assert.equal(player0LBNBBalance.toString(), "999000000000000000", "wrong lbnb balance");
        const tssBalance0 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN(tssInitialBalance).add(web3.utils.toBN("999000000000000000")).add(relayerFee).eq(web3.utils.toBN(tssBalance0)), true, "wrong bnb balance");
        const communityTaxVaultBalance0 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("1000000000000000").eq(web3.utils.toBN(communityTaxVaultBalance0)), true, "wrong bnb balance");

        let stakeTx1 = await steakBankInst.stake("2000000000000000000", {from: player1, value: 202e16});
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

        let stakeTx2 = await steakBankInst.stake("2500000000000000000", {from: player2, value: 252e16});
        truffleAssert.eventEmitted(stakeTx2, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player2.toLowerCase() && ev.bnbAmount.toString() === "2497500000000000000";
        });
        const tssBalance2 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("2497500000000000000").add(relayerFee).add(web3.utils.toBN(tssBalance1)).eq(web3.utils.toBN(tssBalance2)), true, "wrong bnb balance");
        const communityTaxVaultBalance2 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("5500000000000000").eq(web3.utils.toBN(communityTaxVaultBalance2)), true, "wrong bnb balance");

        let stakeTx3 = await steakBankInst.stake("3000000000000000000", {from: player3, value: 302e16});
        truffleAssert.eventEmitted(stakeTx3, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player3.toLowerCase() && ev.bnbAmount.toString() === "2997000000000000000";
        });
        const tssBalance3 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("2997000000000000000").add(relayerFee).add(web3.utils.toBN(tssBalance2)).eq(web3.utils.toBN(tssBalance3)), true, "wrong bnb balance");
        const communityTaxVaultBalance3 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("8500000000000000").eq(web3.utils.toBN(communityTaxVaultBalance3)), true, "wrong bnb balance");

        let stakeTx4 = await steakBankInst.stake("3500000000000000000", {from: player4, value: 352e16});
        truffleAssert.eventEmitted(stakeTx4, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player4.toLowerCase() && ev.bnbAmount.toString() === "3496500000000000000";
        });
        const tssBalance4 = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN("3496500000000000000").add(relayerFee).add(web3.utils.toBN(tssBalance3)).eq(web3.utils.toBN(tssBalance4)), true, "wrong bnb balance");
        const communityTaxVaultBalance4 = await web3.eth.getBalance(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("12000000000000000").eq(web3.utils.toBN(communityTaxVaultBalance4)), true, "wrong bnb balance");

        const lbnbMarketCapacityCountByBNB = await steakBankInst.lbnbMarketCapacityCountByBNB();
        assert.equal(web3.utils.toBN("11988000000000000000").eq(web3.utils.toBN(lbnbMarketCapacityCountByBNB)), true, "wrong lbnbMarketCapacityCountByBNB");

        const lbnbToBNBExchangeRate = await steakBankInst.lbnbToBNBExchangeRate();
        assert.equal(web3.utils.toBN(1e9).eq(web3.utils.toBN(lbnbToBNBExchangeRate)), true, "wrong lbnbToBNBExchangeRate");

        lbnbTotalSupply = await lbnbInst.totalSupply();
        assert.equal(web3.utils.toBN("11988000000000000000").eq(web3.utils.toBN(lbnbTotalSupply)), true, "wrong lbnb totalSupply");
    });

    it('Test Unstake', async () => {
        bcStakingTSS = accounts[4];
        player0 = accounts[5];
        player1 = accounts[6];
        player2 = accounts[7];
        player3 = accounts[8];
        player4 = accounts[9];

        const steakBankInst = await SteakBank.deployed();
        const lbnbInst = await LBNB.deployed();

        await lbnbInst.approve(SteakBank.address, web3.utils.toBN("999000000000000000"), {from: player0})
        const allowance = await lbnbInst.allowance(player0, SteakBank.address);
        assert.equal(web3.utils.toBN("999000000000000000").eq(web3.utils.toBN(allowance)), true, "wrong allowance");

        let unstakeTx0 = await steakBankInst.unstake(web3.utils.toBN("999000000000000000"), {from: player0});
        truffleAssert.eventEmitted(unstakeTx0, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.bnbAmount.toString() === "998001000000000000" && ev.index.toNumber() === 0;
        });

        const lbnbTotalSupply = await lbnbInst.totalSupply();
        assert.equal(web3.utils.toBN("10989999000000000000").eq(web3.utils.toBN(lbnbTotalSupply)), true, "wrong lbnb totalSupply");

        const lbnbMarketCapacityCountByBNB = await steakBankInst.lbnbMarketCapacityCountByBNB();
        assert.equal(web3.utils.toBN("10989999000000000000").eq(web3.utils.toBN(lbnbMarketCapacityCountByBNB)), true, "wrong lbnbMarketCapacityCountByBNB");
        const lbnbToBNBExchangeRate = await steakBankInst.lbnbToBNBExchangeRate();
        assert.equal(web3.utils.toBN(1e9).eq(web3.utils.toBN(lbnbToBNBExchangeRate)), true, "wrong lbnbToBNBExchangeRate");

        const communityTaxVaultLBNBBalance0 = await lbnbInst.balanceOf(CommunityTaxVault.address);
        assert.equal(web3.utils.toBN("999000000000000").eq(web3.utils.toBN(communityTaxVaultLBNBBalance0)), true, "wrong lbnb balance");

        const balanceOfPlayer0 = await lbnbInst.balanceOf(player0);
        assert.equal(web3.utils.toBN(0).eq(web3.utils.toBN(balanceOfPlayer0)), true, "wrong lbnb balance");

        const tailIdx = await steakBankInst.tailIdx();
        assert.equal(web3.utils.toBN(1).eq(web3.utils.toBN(tailIdx)), true, "wrong tailIdx");

        const headerIdx = await steakBankInst.headerIdx();
        assert.equal(web3.utils.toBN(0).eq(web3.utils.toBN(headerIdx)), true, "wrong headerIdx");

        let isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        const transferToUnstakeVaultTx = await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN(998001000000000000), chainId: 666})
        // truffleAssert.eventEmitted(transferToUnstakeVaultTx, "Deposit", (ev) => {
        //     return ev.from.toLowerCase() === bcStakingTSS.toLowerCase() && ev.amount.toNumber() === 1e18;
        // });
        const unstakeVaultBalance = await web3.eth.getBalance(UnstakeVault.address)
        assert.equal(web3.utils.toBN("998001000000000000").eq(web3.utils.toBN(unstakeVaultBalance)), true, "wrong unstakeVaultBalance");

        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");

        const beforeClaimUnstake = await web3.eth.getBalance(player0);
        await steakBankInst.batchClaimPendingUnstake(1, { from: bcStakingTSS});
        const afterClaimUnstake = await web3.eth.getBalance(player0);
        assert.equal(web3.utils.toBN(afterClaimUnstake).sub(web3.utils.toBN(beforeClaimUnstake)).eq(web3.utils.toBN("998001000000000000")), true, "wrong claimed unstake amount");
    });
    it('Test rebaseLBNBToBNB', async () => {
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

        await web3.eth.sendTransaction({ from: bcStakingTSS, to: StakingRewardVault.address, value: web3.utils.toBN(1e18), chainId: 666})

        const lbnbMarketCapacityCountByBNB = await steakBankInst.lbnbMarketCapacityCountByBNB();
        assert.equal(web3.utils.toBN("10989999000000000000").eq(web3.utils.toBN(lbnbMarketCapacityCountByBNB)), true, "wrong lbnbMarketCapacityCountByBNB");
        const lbnbToBNBExchangeRate = await steakBankInst.lbnbToBNBExchangeRate();
        assert.equal(web3.utils.toBN(1e9).eq(web3.utils.toBN(lbnbToBNBExchangeRate)), true, "wrong lbnbToBNBExchangeRate");

        const rebaseLBNBToBNBTx = await steakBankInst.rebaseLBNBToBNB({from: bcStakingTSS})
        truffleAssert.eventEmitted(rebaseLBNBToBNBTx, "LogUpdateLBNBToBNBExchangeRate", (ev) => {
            return ev.LBNBTotalSupply.toString() === "10989999000000000000" && ev.LBNBMarketCapacityCountByBNB.toString() === "11989999000000000000" && ev.LBNBToBNBExchangeRate.toString() === "1090991819";
        });

        let stakeTx0 = await steakBankInst.stake("1000000000000000000", {from: player0, value: 102e16});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase() && ev.lbnbAmount.toString() === "915680560204090769" && ev.bnbAmount.toString() === "999000000000000000";
        });
        const player0LBNBBalance = await lbnbInst.balanceOf(player0);
        assert.equal(player0LBNBBalance.toString(), "915680560204090769", "wrong lbnb balance");

        await lbnbInst.approve(SteakBank.address, web3.utils.toBN("1998000000000000000"), {from: player1})
        let unstakeTx0 = await steakBankInst.unstake(web3.utils.toBN("1998000000000000000"), {from: player1});
        truffleAssert.eventEmitted(unstakeTx0, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player1.toLowerCase() && ev.lbnbAmount.toString() === "1996002000000000000" && ev.bnbAmount.toString() === "2177621850000000000" && ev.index.toNumber() === 1;
        });

        await lbnbInst.approve(SteakBank.address, web3.utils.toBN("2497500000000000000"), {from: player2})
        let unstakeTx1 = await steakBankInst.unstake(web3.utils.toBN("2497500000000000000"), {from: player2});
        truffleAssert.eventEmitted(unstakeTx1, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player2.toLowerCase() && ev.lbnbAmount.toString() === "2495002500000000000" && ev.bnbAmount.toString() === "2722027310000000000" && ev.index.toNumber() === 2;
        });

        await lbnbInst.approve(SteakBank.address, web3.utils.toBN("2997000000000000000"), {from: player3})
        let unstakeTx2 = await steakBankInst.unstake(web3.utils.toBN("2997000000000000000"), {from: player3});
        truffleAssert.eventEmitted(unstakeTx2, "LogUnstake",(ev) => {
            return ev.staker.toLowerCase() === player3.toLowerCase() && ev.lbnbAmount.toString() === "2994003000000000000" && ev.bnbAmount.toString() === "3266432770000000000" && ev.index.toNumber() === 3;
        });

        const headerIdx = await steakBankInst.headerIdx();
        assert.equal(headerIdx.toNumber(), 1, "wrong headerIdx");
        const tailIdx = await steakBankInst.tailIdx();
        assert.equal(tailIdx.toNumber(), 4, "wrong tailIdx");

        let isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(1)));
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(2)));
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN("5166081930000000000"), chainId: 666})

        const unstakeVaultBalance = await web3.eth.getBalance(UnstakeVault.address)
        assert.equal(web3.utils.toBN("6166081930000000000").eq(web3.utils.toBN(unstakeVaultBalance)), true, "wrong unstakeVaultBalance");

        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(headerIdx);
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(1)));
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(web3.utils.toBN(headerIdx).add(web3.utils.toBN(2)));
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        let unstakeLength = await steakBankInst.getUnstakeSeqsLength(player1);
        assert.equal(unstakeLength.toString(), "1", "wrong unstake length");
        unstakeLength = await steakBankInst.getUnstakeSeqsLength(player2);
        assert.equal(unstakeLength.toString(), "1", "wrong unstake length");
        unstakeLength = await steakBankInst.getUnstakeSeqsLength(player3);
        assert.equal(unstakeLength.toString(), "1", "wrong unstake length");

        let priceToAccelerateUnstake = await steakBankInst.priceToAccelerateUnstake();
        assert.equal(priceToAccelerateUnstake.toString(), "10", "wrong priceToAccelerateUnstake");

        await steakBankInst.setPriceToAccelerateUnstake(100, {from: initialGov})
        priceToAccelerateUnstake = await steakBankInst.priceToAccelerateUnstake();
        assert.equal(priceToAccelerateUnstake.toString(), "100", "wrong priceToAccelerateUnstake");
        const costSBFAmount = await steakBankInst.estimateSBFCostForAccelerate(3, 2);

        await steakBankInst.setPriceToAccelerateUnstake(10, {from: initialGov})
        const requiredSBFAmount = await steakBankInst.estimateSBFCostForAccelerate(3, 2);
        assert.equal(web3.utils.toBN(requiredSBFAmount).mul(web3.utils.toBN(10)).eq(web3.utils.toBN(costSBFAmount)),  true, "wrong priceToAccelerateUnstake");

        const sbfInst = await SBF.deployed();
        await sbfInst.transfer(player3, requiredSBFAmount, {from: initialGov});
        const player3SBFBal = await sbfInst.balanceOf(player3);
        assert.equal(web3.utils.toBN(player3SBFBal).eq(web3.utils.toBN(requiredSBFAmount)), true, "wrong sbf balance");
        await sbfInst.approve(SteakBank.address, requiredSBFAmount, {from: player3});

        let firstPlayer3UnstakeIdx = await steakBankInst.getUnstakeSequence(player3, 0)
        assert.equal(firstPlayer3UnstakeIdx.toString(), "3", "wrong player3 first unstake index");

        try {
            await steakBankInst.accelerateUnstakedMature(3, 2, web3.utils.toBN(requiredSBFAmount).sub(web3.utils.toBN(1)), {from: player3});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("cost too much SBF"));
        }

        await steakBankInst.accelerateUnstakedMature(3, 2, requiredSBFAmount, {from: player3});
        firstPlayer3UnstakeIdx = await steakBankInst.getUnstakeSequence(player3, 0)
        assert.equal(firstPlayer3UnstakeIdx.toString(), "1", "wrong player3 first unstake index");

        let firstPlayer2UnstakeIdx = await steakBankInst.getUnstakeSequence(player2, 0);
        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(firstPlayer2UnstakeIdx);
        assert.equal(isUnstakeClaimable, false, "wrong isUnstakeClaimable");

        await web3.eth.sendTransaction({ from: bcStakingTSS, to: UnstakeVault.address, value: web3.utils.toBN(2e18), chainId: 666})

        isUnstakeClaimable = await steakBankInst.isUnstakeClaimable(firstPlayer2UnstakeIdx);
        assert.equal(isUnstakeClaimable, true, "wrong isUnstakeClaimable");

        const beforeClaimUnstakePlayer1 = await web3.eth.getBalance(player1);
        const beforeClaimUnstakePlayer2 = await web3.eth.getBalance(player2);
        const beforeClaimUnstakePlayer3 = await web3.eth.getBalance(player3);
        await steakBankInst.batchClaimPendingUnstake(3, { from: bcStakingTSS});
        const afterClaimUnstakePlayer1 = await web3.eth.getBalance(player1);
        const afterClaimUnstakePlayer2 = await web3.eth.getBalance(player2);
        const afterClaimUnstakePlayer3 = await web3.eth.getBalance(player3);
        assert.equal(web3.utils.toBN(afterClaimUnstakePlayer1).sub(web3.utils.toBN(beforeClaimUnstakePlayer1)).eq(web3.utils.toBN("2177621850000000000")), true, "wrong claimed unstake amount");
        assert.equal(web3.utils.toBN(afterClaimUnstakePlayer2).sub(web3.utils.toBN(beforeClaimUnstakePlayer2)).eq(web3.utils.toBN("2722027310000000000")), true, "wrong claimed unstake amount");
        assert.equal(web3.utils.toBN(afterClaimUnstakePlayer3).sub(web3.utils.toBN(beforeClaimUnstakePlayer3)).eq(web3.utils.toBN("3266432770000000000")), true, "wrong claimed unstake amount");
    });
    it('Test resendBNBToBCStakingTSS', async () => {
        deployerAccount = accounts[0];
        bcStakingTSS = accounts[4];
        player0 = accounts[5];

        const steakBankInst = await SteakBank.deployed();

        await web3.eth.sendTransaction({ from: deployerAccount, to: SteakBank.address, value: web3.utils.toBN(1e18), chainId: 666})

        const beforeResendBCStakingTSS = await web3.eth.getBalance(bcStakingTSS);
        await steakBankInst.resendBNBToBCStakingTSS(web3.utils.toBN(1e18), {value:2e16, from: player0});
        const afterResendBCStakingTSS = await web3.eth.getBalance(bcStakingTSS);
        assert.equal(web3.utils.toBN(afterResendBCStakingTSS).sub(web3.utils.toBN(beforeResendBCStakingTSS)), "1020000000000000000", "wrong resend result");
    });
    it('Test set parameters about fee', async () => {
        initialGov = accounts[1];

        const steakBankInst = await SteakBank.deployed();

        try {
            await steakBankInst.setStakeFeeMolecular(1001, {from: initialGov});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("invalid stakeFeeMolecular"));
        }

        await steakBankInst.setStakeFeeMolecular(100, {from: initialGov});

        try {
            await steakBankInst.setStakeFeeDenominator(90, {from: initialGov});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("invalid stakeFeeDenominator"));
        }

        await steakBankInst.setStakeFeeDenominator(200, {from: initialGov});

        try {
            await steakBankInst.setUnstakeFeeMolecular(1001, {from: initialGov});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("invalid unstakeFeeMolecular"));
        }

        await steakBankInst.setUnstakeFeeMolecular(100, {from: initialGov});

        try {
            await steakBankInst.setUnstakeFeeDenominator(90, {from: initialGov});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("invalid unstakeFeeDenominator"));
        }

        await steakBankInst.setUnstakeFeeDenominator(200, {from: initialGov});

        await steakBankInst.setStakeFeeMolecular(1, {from: initialGov});
        await steakBankInst.setStakeFeeDenominator(1000, {from: initialGov});
        await steakBankInst.setUnstakeFeeMolecular(1, {from: initialGov});
        await steakBankInst.setUnstakeFeeDenominator(1000, {from: initialGov});
    });

    it('Test transfer admin', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        wrongAdmin = accounts[2];

        const steakBankInst = await SteakBank.deployed();

        try {
            await steakBankInst.setPendingAdmin(deployerAccount, {from: wrongAdmin});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("Call must come from admin"));
        }

        let admin = await steakBankInst.admin();
        assert.equal(admin, initialGov,"wrong admin");

        await steakBankInst.setPendingAdmin(deployerAccount, {from: initialGov});

        admin = await steakBankInst.admin();
        assert.equal(admin, initialGov,"wrong admin");

        let pendingAdmin = await steakBankInst.pendingAdmin();
        assert.equal(pendingAdmin, deployerAccount,"wrong pendingAdmin");

        try {
            await steakBankInst.acceptAdmin({from: wrongAdmin});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("Call must come from pendingAdmin"));
        }

        await steakBankInst.acceptAdmin({from: deployerAccount});
        admin = await steakBankInst.admin();
        assert.equal(admin, deployerAccount,"wrong admin");
        pendingAdmin = await steakBankInst.pendingAdmin();
        assert.equal(pendingAdmin, "0x0000000000000000000000000000000000000000","wrong pendingAdmin");

        await steakBankInst.setPendingAdmin(initialGov, {from: deployerAccount});
        await steakBankInst.acceptAdmin({from: initialGov});
    });

    it('Test pause', async () => {
        deployerAccount = accounts[0];
        initialGov = accounts[1];
        player0 = accounts[5];

        const steakBankInst = await SteakBank.deployed();

        let paused = await steakBankInst.paused();
        assert.equal(paused, false,"wrong paused");

        await steakBankInst.pause({from: initialGov});
        paused = await steakBankInst.paused();
        assert.equal(paused, true,"wrong paused");

        try {
            await steakBankInst.stake("1000000000000000000", {from: player0, value: 102e16});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("Pausable: paused"));
        }

        try {
            await steakBankInst.unstake(web3.utils.toBN("999000000000000000"), {from: player0});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("Pausable: paused"));
        }

        await steakBankInst.unpause({from: initialGov});
        paused = await steakBankInst.paused();
        assert.equal(paused, false,"wrong paused");

        const stakeTx0 = await steakBankInst.stake("1000000000000000000", {from: player0, value: 102e16});
        truffleAssert.eventEmitted(stakeTx0, "LogStake",(ev) => {
            return ev.staker.toLowerCase() === player0.toLowerCase();
        });
    });
});