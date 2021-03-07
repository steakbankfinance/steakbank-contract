const BNBStakingTokenImpl = artifacts.require("BNBStakingTokenImpl");
const CommunityTaxVault = artifacts.require("CommunityTaxVault");
const StakingRewardVault = artifacts.require("StakingRewardVault");
const UnstakeVault = artifacts.require("UnstakeVault");

const StakingBNBAgent = artifacts.require("StakingBNBAgent");

const PrivateKeyProvider = require("truffle-privatekey-provider");
const privateKey = "c52b03bf4970940cc153f8a545b0c48dd09d4c104a80ce5188a6857a68ffe927";
const provider =  new PrivateKeyProvider(privateKey, 'https://data-seed-prebsc-1-s3.binance.org:8545/');

const Web3 = require('web3');
const web3 = new Web3(provider);

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BNBStakingTokenImpl);
  deployer.deploy(CommunityTaxVault);
  deployer.deploy(StakingRewardVault);
  deployer.deploy(UnstakeVault);

  deployer.deploy(StakingBNBAgent);
};
