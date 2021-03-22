pragma solidity 0.6.12;

import "./interface/ITokenHub.sol";
import "./interface/IVault.sol";
import "./interface/IMintBurnToken.sol";

import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract StakingBankImpl is Context, Initializable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public constant ZERO_ADDR = 0x0000000000000000000000000000000000000000;
    address public constant TOKENHUB_ADDR = 0x0000000000000000000000000000000000001004;

    uint8 constant public  BreathePeriod = 0;
    uint8 constant public  NormalPeriod = 1;
    uint8 constant public  SnapshotPeriod = 2;

    uint256 public constant minimumStake = 1 * 1e18; // 1:BNB

    address public LBNB;
    address public SBF;
    address public bcStakingTSS;
    address public stakingRewardMaintainer;
    address public stakingRewardVault;
    address public unstakeVault;

    address public admin;
    address public pendingAdmin;

    bool private _paused;

    struct Stake {
        uint256 amount;
        uint256 index;
    }

    struct Unstake {
        address payable staker;
        uint256 amount;
        uint256 timestamp;
    }
    mapping(address => Stake) public stakesMap;
    address[] stakerList;

    mapping(uint256 => Unstake) public unstakesMap;
    mapping(address => uint256[]) public accountUnstakeSeqsMap;
    uint256 public headerIdx;
    uint256 public tailIdx;

    mapping(address => uint256) public stakingReward;

    uint256 public priceToAccelerateUnstake;
    uint256 public nonAccelerateLength; // TODO remove this useless variable

    uint256 public rewardPerStaking;

    event NewAdmin(address indexed newAdmin);
    event NewPendingAdmin(address indexed newPendingAdmin);
    event LogStake(address indexed staker, uint256 amount);
    event LogUnstake(address indexed staker, uint256 amount, uint256 index);
    event MatureUnstake(address indexed staker, uint256 amount, uint256 index);
    event Paused(address account);
    event Unpaused(address account);
    event ReceiveDeposit(address from, uint256 amount);
    event AcceleratedUnstakedBNB(address AcceleratedStaker, uint256 AcceleratedUnstakeIdx);
    event Deposit(address from, uint256 amount);

    constructor() public {}

    /* solium-disable-next-line */
    receive () external payable {
        emit Deposit(msg.sender, msg.value);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin is allowed");
        _;
    }

    modifier onlyRewardMaintainer() {
        require(msg.sender == stakingRewardMaintainer, "only admin is allowed");
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

    modifier notContract() {
        require(!isContract(msg.sender), "contract is not allowed");
        require(msg.sender == tx.origin, "no proxy contract is allowed");
        _;
    }

    function isContract(address addr) internal view returns (bool) {
        uint size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }

    function getMode() public view returns (uint8) {
        uint256 UTCTime = block.timestamp%86400;
        if (UTCTime<=600 || UTCTime>85800) {
            return BreathePeriod;
        } else if (UTCTime <= 84600 && UTCTime > 600) {
            return NormalPeriod;
        } else if (UTCTime <= 85800 && UTCTime > 84600){
            return SnapshotPeriod;
        } else {
            return NormalPeriod;
        }
    }

    function initialize(
        address _admin,
        address _LBNB,
        address _SBF,
        address _bcStakingTSS,
        address _stakingRewardMaintainer,
        address _stakingRewardVault,
        address _unstakeVault,
        uint256 _priceToAccelerateUnstake
    ) external initializer{
        admin = _admin;

        LBNB = _LBNB;
        SBF = _SBF;

        bcStakingTSS = _bcStakingTSS;
        stakingRewardMaintainer = _stakingRewardMaintainer;

        stakingRewardVault = _stakingRewardVault;
        unstakeVault = _unstakeVault;

        priceToAccelerateUnstake = _priceToAccelerateUnstake;
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
        require(msg.sender == pendingAdmin, "StakingBank::acceptAdmin: Call must come from pendingAdmin.");
        admin = msg.sender;
        pendingAdmin = address(0);

        emit NewAdmin(admin);
    }

    function setPendingAdmin(address pendingAdmin_) external {
        require(msg.sender == address(this), "StakingBank::setPendingAdmin: Call must come from admin.");
        pendingAdmin = pendingAdmin_;

        emit NewPendingAdmin(pendingAdmin);
    }

    function setBCStakingTSS(address newBCStakingTSS) onlyAdmin external {
        bcStakingTSS = newBCStakingTSS;
    }

    function setStakingRewardVault(address newStakingRewardVault) onlyAdmin external {
        stakingRewardVault = newStakingRewardVault;
    }

    function setUnstakeVault(address newUnstakeVault) onlyAdmin external {
        unstakeVault = newUnstakeVault;
    }

    function setPriceToAccelerateUnstake(uint256 newPriceToAccelerateUnstake) onlyAdmin external {
        priceToAccelerateUnstake = newPriceToAccelerateUnstake;
    }

    function stakeBNB(uint256 amount) notContract nonReentrant mustInMode(NormalPeriod) whenNotPaused external payable returns (bool) {

        uint256 miniRelayFee = ITokenHub(TOKENHUB_ADDR).getMiniRelayFee();

        require(msg.value == amount.add(miniRelayFee), "msg.value must equal to amount + miniRelayFee");
        require(amount%1e10==0 && amount>=minimumStake, "staking amount must be N * 1e10 and be greater than minimumStake");

        ITokenHub(TOKENHUB_ADDR).transferOut{value:msg.value}(ZERO_ADDR, bcStakingTSS, amount, uint64(block.timestamp + 3600));

        amount = amount.div(1e10);
        IMintBurnToken(LBNB).mintTo(msg.sender, amount); // LBNB decimals is 8
        Stake storage userStake = stakesMap[msg.sender];
        if (userStake.amount == 0) {
            stakesMap[msg.sender] = Stake({
                amount: amount,
                index: stakerList.length
            });
            stakerList.push(msg.sender);
        } else {
            userStake.amount = userStake.amount.add(amount);
        }
        emit LogStake(msg.sender, amount);

        return true;
    }

    function unstakeBNB(uint256 amount) notContract nonReentrant mustInMode(NormalPeriod) whenNotPaused external returns (bool) {
        Stake storage userStake = stakesMap[msg.sender];
        require(userStake.amount > 0 && userStake.amount >= amount, "staking not enough");
        userStake.amount = userStake.amount.sub(amount);
        if (userStake.amount == 0) {
            if (userStake.index != (stakerList.length-1)) {
                address lastStaker = stakerList[stakerList.length-1];
                Stake storage lastUserStake = stakesMap[lastStaker];
                lastUserStake.index = userStake.index;
                stakerList[userStake.index] = lastStaker;
            }
            stakerList.pop();
        }

        IERC20(LBNB).safeTransferFrom(msg.sender, address(this), amount);
        IMintBurnToken(LBNB).burn(amount);

        unstakesMap[tailIdx] = Unstake({
            staker: msg.sender,
            amount: amount,
            timestamp: block.timestamp
        });
        uint256[] storage unstakes = accountUnstakeSeqsMap[msg.sender];
        unstakes.push(tailIdx);

        emit LogUnstake(msg.sender, amount, tailIdx);
        tailIdx++;
        return true;
    }

    function estimateSBFCostForAccelerate(uint256 unstakeIndex, uint256 steps) external view returns (uint256) {
        if (steps == 0) return 0;
        if (unstakeIndex<steps) return 0;
        if ((unstakeIndex-steps)<headerIdx || unstakeIndex>=tailIdx) return 0;

        Unstake memory unstake = unstakesMap[unstakeIndex];
        uint256 sbfBurnAmount = unstake.amount.mul(steps).mul(priceToAccelerateUnstake);
        for (uint256 idx = unstakeIndex-1 ; idx >= unstakeIndex.sub(steps); idx--) {
            Unstake memory priorUnstake = unstakesMap[idx];
            sbfBurnAmount = sbfBurnAmount.add(priorUnstake.amount.mul(priceToAccelerateUnstake));
        }
        return sbfBurnAmount;
    }

    function accelerateUnstakedMature(uint256 unstakeIndex, uint256 steps, uint256 sbfMaxCost) nonReentrant whenNotPaused external returns (bool) {
        require(steps > 0, "accelerate steps must be greater than zero");
        require(unstakeIndex.sub(steps)>=headerIdx && unstakeIndex<tailIdx, "unstakeIndex is out of valid accelerate range");

        Unstake memory unstake = unstakesMap[unstakeIndex];
        require(unstake.staker==msg.sender, "only staker can accelerate itself");

        uint256 sbfBurnAmount = unstake.amount.mul(steps).mul(priceToAccelerateUnstake);
        for (uint256 idx = unstakeIndex-1 ; idx >= unstakeIndex.sub(steps); idx--) {
            Unstake memory priorUnstake = unstakesMap[idx];
            unstakesMap[idx+1] = priorUnstake;
            sbfBurnAmount = sbfBurnAmount.add(priorUnstake.amount.mul(priceToAccelerateUnstake));
            uint256[] storage priorUnstakeSeqs = accountUnstakeSeqsMap[priorUnstake.staker];
            bool found = false;
            for(uint256 i=0; i < priorUnstakeSeqs.length; i++) {
                if (priorUnstakeSeqs[i]==idx) {
                    priorUnstakeSeqs[i]=idx+1;
                    found = true;
                    break;
                }
            }
            require(found, "failed to find matched unstake sequence");
        }

        uint256[] storage unstakeSeqs = accountUnstakeSeqsMap[msg.sender];
        unstakesMap[unstakeIndex-steps] = unstake;
        bool found = false;
        for(uint256 idx=0; idx < unstakeSeqs.length; idx++) {
            if (unstakeSeqs[idx]==unstakeIndex) {
                unstakeSeqs[idx] = unstakeIndex - steps;
                found = true;
                break;
            }
        }
        require(found, "failed to find matched unstake sequence");

        require(sbfBurnAmount<=sbfMaxCost, "cost too much SBF");
        IERC20(SBF).safeTransferFrom(msg.sender, address(this), sbfBurnAmount);
        IMintBurnToken(SBF).burn(sbfBurnAmount);

        emit AcceleratedUnstakedBNB(msg.sender, unstakeIndex);

        return true;
    }

    function getStakerListLength() external view returns (uint256) {
        return stakerList.length;
    }

    function getStakerByIndex(uint256 idx) external view returns (address) {
        return stakerList[idx];
    }

    function getUnstakeSeqsLength(address addr) external view returns (uint256) {
        return accountUnstakeSeqsMap[addr].length;
    }

    function getUnstakeSequence(address addr, uint256 idx) external view returns (uint256) {
        return accountUnstakeSeqsMap[addr][idx];
    }

    function isUnstakeMature(uint256 unstakeSeq) external view returns (bool) {
        if (unstakeSeq < headerIdx || unstakeSeq >= tailIdx) {
            return false;
        }
        uint256 totalUnstakeAmount = 0;
        for(uint256 idx=headerIdx; idx <= unstakeSeq; idx++) {
            Unstake memory unstake = unstakesMap[idx];
            totalUnstakeAmount=totalUnstakeAmount.add(unstake.amount.mul(1e10));
        }
        return unstakeVault.balance >= totalUnstakeAmount;
    }

    function batchClaimUnstakedBNB(uint256 batchSize) nonReentrant whenNotPaused external {
        for(uint256 idx=0; idx < batchSize && headerIdx < tailIdx; idx++) {
            Unstake memory unstake = unstakesMap[headerIdx];
            uint256 unstakeBNBAmount = unstake.amount.mul(1e10);
            if (unstakeVault.balance < unstakeBNBAmount) {
                return;
            }
            delete unstakesMap[headerIdx];
            uint256 actualAmount = IVault(unstakeVault).claimBNB(unstakeBNBAmount, unstake.staker);
            require(actualAmount==unstakeBNBAmount, "amount mismatch");
            emit MatureUnstake(unstake.staker, unstake.amount, headerIdx);

            uint256[] storage unstakeSeqs = accountUnstakeSeqsMap[unstake.staker];
            uint256 lastSeq = unstakeSeqs[unstakeSeqs.length-1];
            if (lastSeq != headerIdx) {
                bool found = false;
                for(uint256 index=0; index < unstakeSeqs.length; index++) {
                    if (unstakeSeqs[index]==headerIdx) {
                        unstakeSeqs[index] = lastSeq;
                        found = true;
                        break;
                    }
                }
                require(found, "failed to find matched unstake sequence");
            }
            unstakeSeqs.pop();

            headerIdx++;
        }
    }

    function claimStakingReward() nonReentrant whenNotPaused external returns (bool) {
        uint256 rewardAmount = stakingReward[msg.sender];
        require(rewardAmount>0, "no staking reward");
        stakingReward[msg.sender] = 0;
        uint256 actualAmount = IVault(stakingRewardVault).claimBNB(rewardAmount, msg.sender);
        if (rewardAmount > actualAmount) {
            stakingReward[msg.sender] = rewardAmount.sub(actualAmount);
        }
        return true;
    }

    function setStakingReward(uint256[] memory rewards, address[] memory stakers) onlyRewardMaintainer whenNotPaused external returns(bool) {
        require(rewards.length==stakers.length, "rewards length must equal to stakers length");
        for(uint256 idx=0; idx<rewards.length; idx++){
            stakingReward[stakers[idx]] = stakingReward[stakers[idx]].add(rewards[idx]);
        }
        return true;
    }

    function updateRewardPerStaking(uint256 newRewardPerStaking) onlyRewardMaintainer whenNotPaused external returns(bool) {
        rewardPerStaking = newRewardPerStaking;
        return true;
    }

    function resendBNBToBCStakingTSS(uint256 amount) onlyRewardMaintainer whenNotPaused external payable returns(bool) {

        uint256 miniRelayFee = ITokenHub(TOKENHUB_ADDR).getMiniRelayFee();

        require(msg.value == miniRelayFee, "msg.value must equal to miniRelayFee");
        require(address(this).balance >= amount, "stakeBank BNB balance is not enough");
        require(amount%1e10==0, "amount must be N * 1e10");

        ITokenHub(TOKENHUB_ADDR).transferOut{value:miniRelayFee.add(amount)}(ZERO_ADDR, bcStakingTSS, amount, uint64(block.timestamp + 3600));

        return true;
    }
}
