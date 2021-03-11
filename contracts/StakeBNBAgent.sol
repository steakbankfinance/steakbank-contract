pragma solidity 0.6.12;

import "./interface/ITokenHub.sol";
import "./interface/IVault.sol";
import "./interface/IMintBurnToken.sol";

import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract StakingBNBAgent is Context, Initializable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public constant ZERO_ADDR = 0x0000000000000000000000000000000000000000;
    address public constant TOKENHUB_ADDR = 0x0000000000000000000000000000000000001004;

    uint8 constant public  BreathePeriod = 0;
    uint8 constant public  NormalPeriod = 1;
    uint8 constant public  SnapshotPeriod = 2;

    uint256 public constant minimumStake = 1 * 1e18; // 1:BNB
    uint256 public constant minimumUnstake = 1 * 1e8; // 1:SBNB

    address public LBNB;
    address public bcStakingTSS;
    address public stakingRewardMaintainer;
    address public stakingRewardVault;
    address public unstakeVault;

    address public admin;
    address public pendingAdmin;

    bool private _paused;

    struct Unstake {
        address payable staker;
        uint256 amount;
    }
    mapping(uint256 => Unstake) public unstakesMap;
    uint256 public headerIdx;
    uint256 public tailIdx;

    mapping(address => uint256) public stakingReward;

    event NewAdmin(address indexed newAdmin);
    event NewPendingAdmin(address indexed newPendingAdmin);
    event LogStake(address indexed staker, uint256 amount);
    event LogUnstake(address indexed staker, uint256 amount, uint256 index);
    event MatureUnstake(address indexed staker, uint256 amount, uint256 index);
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

    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }

    modifier mustInMode(uint8 expectedMode) {
        require(getMode() == expectedMode, "Wrong mode");
        _;
    }

    function getMode() public returns (uint8) {
        uint256 UTCTime = block.timestamp%86400;
        if (UTCTime<=600 || UTCTime>85800) {
            return BreathePeriod;
        } else if (UTCTime <= 84600 && UTCTime > 600) {
            return NormalPeriod;
        } else if (UTCTime <= 85800 && UTCTime > 84600){
            return SnapshotPeriod;
        }
    }

    function initialize(
        address adminAddr,
        address lbnbAddr,
        address bcStakingTSSAddr,
        address stakingRewardMaintainerAddr,
        address stakingRewardVaultAddr,
        address unstakeVaultAddr
    ) external initializer{
        admin = adminAddr;

        LBNB = lbnbAddr;

        bcStakingTSS = bcStakingTSSAddr;
        stakingRewardMaintainer = stakingRewardMaintainerAddr;

        stakingRewardVault = stakingRewardVaultAddr;
        unstakeVault = unstakeVaultAddr;
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

    function setbcStakingTSS(address newbcStakingTSS) onlyAdmin external {
        bcStakingTSS = newbcStakingTSS;
    }

    function setStakingRewardVault(address newStakingRewardVault) onlyAdmin external {
        stakingRewardVault = newStakingRewardVault;
    }

    function setUnstakeVault(address newUnstakeVault) onlyAdmin external {
        unstakeVault = newUnstakeVault;
    }

    function stakeBNB(uint256 amount) nonReentrant mustInMode(NormalPeriod) whenNotPaused external payable returns (bool) {
        uint256 miniRelayFee = ITokenHub(TOKENHUB_ADDR).getMiniRelayFee();
        require(msg.value == amount + miniRelayFee, "msg.value must equal to amount + miniRelayFee");
        require(amount%1e10==0 && amount>minimumStake, "staking amount must be N * 1e10 and be greater than minimumStake");

        IMintBurnToken(LBNB).mintTo(msg.sender, amount/1e10); // StakingBNB decimals is 8
        ITokenHub(TOKENHUB_ADDR).transferOut{value:msg.value}(ZERO_ADDR, bcStakingTSS, amount, uint64(block.timestamp + 3600));

        return true;
    }

    function unstakeBNB(uint256 amount) nonReentrant mustInMode(NormalPeriod) whenNotPaused external returns (bool) {
        require(amount > minimumUnstake, "Invalid unstake amount");
        IERC20(LBNB).safeTransferFrom(msg.sender, address(this), amount);
        IMintBurnToken(LBNB).burn(amount);

        unstakesMap[tailIdx] = Unstake({
            staker: msg.sender,
            amount: amount
        });

        emit LogUnstake(msg.sender, amount, tailIdx);
        tailIdx++;
        return true;
    }

    function batchClaimUnstakedBNB(uint256 batchSize) nonReentrant mustInMode(NormalPeriod) whenNotPaused external {
        for(uint256 idx=0; idx < batchSize && headerIdx < tailIdx; idx++) {
            Unstake memory unstake = unstakesMap[headerIdx];
            uint256 unstakeBNBAmount = unstake.amount.mul(1e10);
            if (unstakeVault.balance < unstakeBNBAmount) {
                return;
            }
            uint256 actualAmount = IVault(unstakeVault).claimBNB(unstakeBNBAmount, unstake.staker);
            require(actualAmount==unstakeBNBAmount, "amount mismatch");

            emit MatureUnstake(unstake.staker, unstake.amount, headerIdx);

            delete unstakesMap[headerIdx];
            headerIdx++;
        }
    }

    function claimStakingReward() nonReentrant mustInMode(NormalPeriod) whenNotPaused external returns (bool) {
        uint256 rewardAmount = stakingReward[msg.sender];
        stakingReward[msg.sender] = 0;
        uint256 actualAmount = IVault(stakingRewardVault).claimBNB(rewardAmount, msg.sender);
        if (rewardAmount > actualAmount) {
            stakingReward[msg.sender] = rewardAmount.sub(actualAmount);
        }
        return true;
    }

    function setStakingReward(uint256[] memory rewards, address[] memory stakers) whenNotPaused external returns(bool) {
        require(msg.sender == stakingRewardMaintainer, "only stakingRewardMaintainer is allowed");
        require(rewards.length==stakers.length, "rewards length must equal to stakers length");
        for(uint256 idx=0; idx<rewards.length; idx++){
            stakingReward[stakers[idx]] = stakingReward[stakers[idx]].add(rewards[idx]);
        }
        return true;
    }
}
