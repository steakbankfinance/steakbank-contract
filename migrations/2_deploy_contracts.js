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

const MockPancakeRouter = artifacts.require("MockPancakeRouter");

module.exports = function (deployer, network, accounts) {
  deployerAccount = accounts[0];
  initialGov = accounts[1];
  govGuardian = accounts[3];
  bcStakingTSS = accounts[4];

  deployer.deploy(SteakBank).then(async () => {
    await deployer.deploy(FarmRewardLock);
    await deployer.deploy(FarmingCenter);

    await deployer.deploy(LBNB, SteakBank.address);
    await deployer.deploy(SBF, initialGov);

    await deployer.deploy(MockPancakeRouter, LBNB.address, SBF.address);

    const MockBUSDAddr = "0x0000000000000000000000000000000000000000";
    const MockWBNBAddr = "0x0000000000000000000000000000000000000000";
    await deployer.deploy(CommunityTaxVault, initialGov, LBNB.address, SBF.address, MockWBNBAddr, MockBUSDAddr, MockPancakeRouter.address);
    await deployer.deploy(StakingRewardVault, SteakBank.address);
    await deployer.deploy(UnstakeVault, SteakBank.address);

    await deployer.deploy(Timelock, initialGov, 10);
    await deployer.deploy(Governor, Timelock.address, SBF.address, govGuardian);
    const timelockInst = await Timelock.deployed();
    await timelockInst.setAdmin(Governor.address, {from: initialGov});

    const steakBankInst = await SteakBank.deployed();
    const farmRewardLockInst = await FarmRewardLock.deployed();
    const farmingCenterInst = await FarmingCenter.deployed();
    const sbfInst = await SBF.deployed();

    await steakBankInst.initialize(initialGov, LBNB.address, SBF.address, bcStakingTSS, CommunityTaxVault.address, StakingRewardVault.address, UnstakeVault.address, "10", {from: deployerAccount});
    await farmRewardLockInst.initialize(SBF.address, "100", "100", FarmingCenter.address, initialGov, {from: deployerAccount});
    await farmingCenterInst.initialize(initialGov, SBF.address, FarmRewardLock.address, "10000000000000000000", "30", "7", "10", {from: deployerAccount});
    await sbfInst.transferOwnership(FarmingCenter.address, {from: initialGov});
  });
};
