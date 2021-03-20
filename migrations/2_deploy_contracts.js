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

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BNBStakingTokenImpl);
  deployer.deploy(CommunityTaxVault);
  deployer.deploy(StakingRewardVault);
  deployer.deploy(UnstakeVault);

  deployer.deploy(StakingBNBAgent);
};
