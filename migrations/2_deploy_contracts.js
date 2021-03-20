const LBNB = artifacts.require("LBNB");
const SBF = artifacts.require("SBF");

const UnstakeVault = artifacts.require("UnstakeVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");

const StakingBank = artifacts.require("StakingBankImpl");

const FarmRewardLock = artifacts.require("FarmRewardLock");
const FarmingCenter = artifacts.require("FarmingCenter");

const Governor = artifacts.require("Governor");
const Timelock = artifacts.require("Timelock");

module.exports = function (deployer, network, accounts) {
  deployerAccount = accounts[0];
  initialGov = accounts[1];
  rewardMaintainer = accounts[2];
  govGuardian = accounts[3];
  bcStakingTSS = accounts[4];

  deployer.deploy(StakingBank).then(async () => {
    await deployer.deploy(FarmRewardLock);
    await deployer.deploy(FarmingCenter);

    await deployer.deploy(CommunityTaxVault, initialGov);
    await deployer.deploy(StakingRewardVault, StakingBank.address);
    await deployer.deploy(UnstakeVault, StakingBank.address);

    await deployer.deploy(LBNB, StakingBank.address);
    await deployer.deploy(SBF, deployerAccount);

    await deployer.deploy(Timelock, initialGov, 5 * 86400);
    await deployer.deploy(Governor, Timelock.address, SBF.address, govGuardian);

    const stakingBankInst = await StakingBank.deployed();
    const farmRewardLockInst = await FarmRewardLock.deployed();
    const farmingCenterInst = await FarmingCenter.deployed();

    await stakingBankInst.initialize(initialGov, LBNB.address, SBF.address, bcStakingTSS, rewardMaintainer, StakingRewardVault.address, UnstakeVault.address, "100000000000", {from: deployerAccount});
    await farmRewardLockInst.initialize(SBF.address, "1000", "100", initialGov, FarmingCenter.address,  {from: deployerAccount});
    await farmingCenterInst.initialize(initialGov, LBNB.address, SBF.address, FarmRewardLock.address, "10000000000000000000", "500", "7", "10", {from: deployerAccount});
  });
};
