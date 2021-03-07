pragma solidity 0.6.12;

import "./interface/IBEP20.sol";
import "./interface/ITokenHub.sol";
import "./interface/ICrossChain.sol";
import "./interface/IVault.sol";
import "./interface/IStakingBNBToken.sol";

import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";

contract StakingBNBAgent is Context, Initializable {
    using SafeMath for uint256;

    address public constant ZERO_ADDR = 0x0000000000000000000000000000000000000000;
    address public constant TOKENHUB_ADDR = 0x0000000000000000000000000000000000001004;
    address public constant CROSSCHAIN_ADDR = 0x0000000000000000000000000000000000002000;

    uint8 constant public  BreathePeriod = 0;
    uint8 constant public  CalculateRewardPeriod = 1;
    uint8 constant public  NormalPeriod = 2;
    uint8 constant public  SnapshotPeriod = 3;

    uint256 public constant minimumStake = 1 * 1e18; // 1:BNB

    address public BNBStakingToken;
    address public BCStakingProxyAddr;
    address public maintainer;
    address public stakingRewardVault;
    address public unstakeVault;
    address public communityTaxVault;

    address public admin;
    address public pendingAdmin;

    bool private _paused;

    struct Unstake {
        address payable staker;
        uint256 amount;
    }
    mapping(uint256 => Unstake) unstakesMap;
    uint256 headerIdx;
    uint256 tailIdx;

    mapping(address => uint256) stakingReward;

    event NewAdmin(address indexed newAdmin);
    event NewPendingAdmin(address indexed newPendingAdmin);
    event LogStake(address indexed staker, uint256 amount);
    event LogUnstake(address indexed staker, uint256 amount);
    event MatureUnstake(address indexed staker, uint256 amount);
    event Paused(address account);
    event Unpaused(address account);
    event ReceiveDeposit(address from, uint256 amount);

    constructor() public {}

    receive() external payable{
        emit ReceiveDeposit(msg.sender, msg.value);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin is allowed");
        _;
    }

    function isContract(address addr) internal view returns (bool) {
        uint size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }

    modifier notContract() {
        require(!isContract(msg.sender) && msg.sender == tx.origin, "contract is not allowed");
        _;
    }

    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }

    modifier mustInMode(uint8 expectedMode) {
        require(calculateMode() == expectedMode, "Wrong mode");
        _;
    }

    function calculateMode() internal returns (uint8) {
        uint256 UTCTime = block.timestamp%86400;
        if (UTCTime<=600 || UTCTime<85800) {
            return BreathePeriod;
        } else if (UTCTime <= 1800 && UTCTime > 600) {
            return CalculateRewardPeriod;
        } else if (UTCTime <= 84600 && UTCTime > 1800) {
            return NormalPeriod;
        } else if (UTCTime <= 85800 && UTCTime > 84600){
            return SnapshotPeriod;
        }
    }

    function initialize(
        address adminAddr,
        address bnbStakingToken,
        address bcStakingProxyAddr,
        address maintainerAddr,
        address stakingRewardVaultAddr,
        address unstakeVaultAddr,
        address communityTaxVaultAddr
    ) external initializer{
        admin = adminAddr;

        BNBStakingToken = bnbStakingToken;

        BCStakingProxyAddr = bcStakingProxyAddr;
        maintainer = maintainerAddr;

        stakingRewardVault = stakingRewardVaultAddr;
        unstakeVault = unstakeVaultAddr;
        communityTaxVault = communityTaxVaultAddr;
    }

    function paused() public view returns (bool) {
        return _paused;
    }

    function pause() external onlyAdmin whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function unpause() external onlyAdmin whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Timelock::acceptAdmin: Call must come from pendingAdmin.");
        admin = msg.sender;
        pendingAdmin = address(0);

        emit NewAdmin(admin);
    }

    function setPendingAdmin(address pendingAdmin_) external {
        require(msg.sender == address(this), "Timelock::setPendingAdmin: Call must come from Timelock.");
        pendingAdmin = pendingAdmin_;

        emit NewPendingAdmin(pendingAdmin);
    }

    function setBCStakingProxyAddr(address newBCStakingProxyAddr) onlyAdmin external {
        BCStakingProxyAddr = newBCStakingProxyAddr;
    }

    function setStakingRewardVault(address newStakingRewardVault) onlyAdmin external {
        stakingRewardVault = newStakingRewardVault;
    }

    function setUnstakeVault(address newUnstakeVault) onlyAdmin external {
        unstakeVault = newUnstakeVault;
    }

    function setCommunityTaxVault(address newCommunityTaxVault) onlyAdmin external {
        communityTaxVault = newCommunityTaxVault;
    }

    function spendCommunityTax(address payable recipient, uint256 amount) onlyAdmin external {
        uint256 actualAmount = IVault(communityTaxVault).claimBNB(amount);
        recipient.transfer(actualAmount);
    }

    function stakeBNB(uint256 amount) notContract mustInMode(NormalPeriod) whenNotPaused external payable returns (bool) {
        uint256 miniRelayFee = ITokenHub(TOKENHUB_ADDR).getMiniRelayFee();
        require(msg.value == amount + miniRelayFee, "msg.value must equal to amount + miniRelayFee");
        require(amount%1e10==0 && amount>minimumStake, "staking amount must be N * 1e10 and be greater than minimumStake");

        IStakingBNBToken(BNBStakingToken).mintTo(msg.sender, amount%1e10); // StakingBNB decimals is 8
        ITokenHub(TOKENHUB_ADDR).transferOut{value:msg.value}(ZERO_ADDR, BCStakingProxyAddr, amount, uint64(block.timestamp + 3600));

        return true;
    }

    function unstakeBNB(uint256 amount) notContract mustInMode(NormalPeriod) whenNotPaused external payable returns (bool) {
        uint256 miniRelayFee = ITokenHub(TOKENHUB_ADDR).getMiniRelayFee();
        require(msg.value > miniRelayFee, "relay fee is not enough");

        require(amount > minimumStake, "Invalid unstake amount");
        IBEP20(BNBStakingToken).transferFrom(msg.sender, address(this), amount);
        IStakingBNBToken(BNBStakingToken).burn(amount);

        unstakesMap[tailIdx] = Unstake({
            staker: msg.sender,
            amount: amount
        });
        tailIdx++;

        emit LogUnstake(msg.sender, amount);
        return true;
    }

    function batchClaimUnstakedBNB(uint256 batchSize) notContract mustInMode(NormalPeriod) whenNotPaused external {
        for(uint256 idx=0; idx < batchSize && headerIdx < tailIdx; idx++) {
            Unstake memory unstake = unstakesMap[idx];
            if (unstakeVault.balance < unstake.amount) {
                return;
            }
            uint256 actualAmount = IVault(unstakeVault).claimBNB(unstake.amount);
            require(actualAmount==unstake.amount, "amount mismatch");
            unstake.staker.transfer(unstake.amount);

            emit MatureUnstake(unstake.staker, unstake.amount);

            delete unstakesMap[headerIdx];
            headerIdx++;
        }
    }

    function claimStakingReward() notContract mustInMode(NormalPeriod) whenNotPaused external returns (bool) {
        uint256 rewardAmount = stakingReward[msg.sender];
        uint256 actualAmount = IVault(stakingRewardVault).claimBNB(rewardAmount);
        stakingReward[msg.sender] = rewardAmount.sub(actualAmount);
        msg.sender.transfer(rewardAmount);
        return true;
    }

    function setStakingReward(uint256[] memory rewards, address[] memory stakers) mustInMode(CalculateRewardPeriod) whenNotPaused external returns(bool) {
        require(msg.sender == maintainer, "only maintainer is allowed");
        require(rewards.length==stakers.length, "rewards length must equal to stakers length");
        for(uint256 idx=0; idx<rewards.length; idx++){
            stakingReward[stakers[idx]] = stakingReward[stakers[idx]].add(rewards[idx]);
        }
        return true;
    }
}
