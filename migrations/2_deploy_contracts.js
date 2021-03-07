const BNBStakingTokenImpl = artifacts.require("BNBStakingTokenImpl");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const UnstakeVault = artifacts.require("UnstakeVault");

const StakingBNBAgent = artifacts.require("StakingBNBAgent");

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BNBStakingTokenImpl);
  deployer.deploy(CommunityTaxVault);
  deployer.deploy(StakingRewardVault);
  deployer.deploy(UnstakeVault);

  deployer.deploy(StakingBNBAgent);
};
