pragma solidity 0.6.12;

import '../lib/Ownable.sol';
import "../interface/IFarmRewardLock.sol";

import "openzeppelin-solidity/contracts/GSN/Context.sol";

import '@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol';

contract FarmRewardLock is Context, Ownable, IFarmRewardLock {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    bool public initialized;

    IBEP20 public skb;
    uint256 public startReleaseHeight;
    uint256 public releasePeriod;
    address public masterChef;

    struct UserLockInfo {
        uint256 lockedAmount;
        uint256 unlockedAmount;
        uint256 lastUpdateHeight;
    }

    mapping(address => UserLockInfo) public userLockInfos;

    event DepositSKB(address indexed user, uint256 amount);

    constructor() public {}

    modifier onlyMasterChef() {
        require(masterChef == _msgSender(), 'FarmRewardLock: caller is not masterChef');
        _;
    }

    function initialize(
        IBEP20 _skb,
        uint256 _startReleaseHeight,
        uint256 _releasePeriod,
        address _masterChef,
        address _owner
    ) public {
        require(!initialized, "FarmRewardLock: already initialized");
        initialized = true;

        require(_releasePeriod>0, "FarmRewardLock: releasePeriod must be positive");

        skb = _skb;
        startReleaseHeight= _startReleaseHeight;
        releasePeriod= _releasePeriod;
        masterChef = _masterChef;
        super.initializeOwner(_owner);
    }

    function getLockEndHeight() override external view returns (uint256) {
        return startReleaseHeight.add(releasePeriod);
    }

    function notifyDeposit(address user, uint256 amount) onlyMasterChef override external returns (bool){
        require(block.number<=startReleaseHeight.add(releasePeriod), "FarmRewardLock: should not deposit after lockEndHeight");

        UserLockInfo storage lockInfo = userLockInfos[user];
        if (block.number <= startReleaseHeight) {
            lockInfo.lockedAmount = lockInfo.lockedAmount.add(amount);
        } else {
            uint256 lastUpdateHeight = lockInfo.lastUpdateHeight;
            if (lastUpdateHeight == 0) {
                lastUpdateHeight = startReleaseHeight;
            }
            uint256 lastRestLockPeriod = startReleaseHeight.add(releasePeriod).sub(lastUpdateHeight);
            uint256 newUnlockAmount = lockInfo.lockedAmount.mul(block.number-lastUpdateHeight).div(lastRestLockPeriod);
            lockInfo.unlockedAmount = lockInfo.unlockedAmount.add(newUnlockAmount);
            lockInfo.lockedAmount = lockInfo.lockedAmount.sub(newUnlockAmount).add(amount);
            lockInfo.lastUpdateHeight = block.number;
        }

        emit DepositSKB(user, amount);
        return true;
    }

    function unlockedAmount(address userAddr) public view returns (uint256, uint256) {
        if (block.number <= startReleaseHeight) {
            return (0, 0);
        } else if (block.number > startReleaseHeight.add(releasePeriod)) {
            UserLockInfo memory lockInfo = userLockInfos[userAddr];
            return (lockInfo.unlockedAmount, lockInfo.lockedAmount);
        }
        UserLockInfo memory lockInfo = userLockInfos[userAddr];

        uint256 lastUpdateHeight = lockInfo.lastUpdateHeight;
        if (lastUpdateHeight == 0) {
            lastUpdateHeight = startReleaseHeight;
        }

        uint256 lastRestLockPeriod = startReleaseHeight.add(releasePeriod).sub(lastUpdateHeight);
        uint256 newUnlockAmount = lockInfo.lockedAmount.mul(block.number-lastUpdateHeight).div(lastRestLockPeriod);

        return (lockInfo.unlockedAmount, newUnlockAmount);
    }

    function claim() external returns (bool){
        (uint256 alreadyUnlockAmount, uint256 newUnlockAmount) = unlockedAmount(_msgSender());
        uint256 claimAmount = alreadyUnlockAmount.add(newUnlockAmount);
        require(claimAmount > 0, "FarmRewardLock: no locked reward");
        UserLockInfo storage lockInfo = userLockInfos[_msgSender()];
        lockInfo.lockedAmount = lockInfo.lockedAmount.sub(newUnlockAmount);
        lockInfo.unlockedAmount = 0;
        lockInfo.lastUpdateHeight = block.number;

        skb.safeTransfer(_msgSender(), claimAmount);
        return true;
    }

    function setMasterChef(address newMasterChef) onlyOwner external {
        masterChef = newMasterChef;
    }

    function setStartReleaseHeight(uint256 newStartReleaseHeight) onlyOwner external {
        startReleaseHeight = newStartReleaseHeight;
    }

    function setReleasePeriod(uint256 newReleasePeriod) onlyOwner external {
        releasePeriod = newReleasePeriod;
    }
}