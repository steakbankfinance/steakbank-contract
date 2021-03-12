pragma solidity 0.6.12;

import "../interface/IFarmRewardLock.sol";

import "openzeppelin-solidity/contracts/GSN/Context.sol";

import '@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol';

contract FarmRewardLock is Context, IFarmRewardLock {
    using SafeMath for uint256;
    using SafeMath for uint64;
    using SafeBEP20 for IBEP20;

    bool public initialized;

    IBEP20 public skb;
    uint64 public startReleaseHeight;
    uint64 public releasePeriod;
    address public masterChef;

    mapping(address => uint256) lockedUsersSKB;

    event DepositSKB(address user, uint256 amount);

    constructor() public {}

    modifier onlyMasterChef() {
        require(masterChef == _msgSender(), 'FarmRewardLock: caller is not masterChef');
        _;
    }

    function initialize(
        IBEP20 _skb,
        uint64 _startReleaseHeight,
        uint64 _releasePeriod
    ) public {
        require(!initialized, "FarmRewardLock: already initialized");
        initialized = true;

        require(_releasePeriod>0, "FarmRewardLock: releasePeriod must be positive");

        skb = _skb;
        startReleaseHeight= _startReleaseHeight;
        releasePeriod= _releasePeriod;
    }

    function getStartReleaseHeight() override external returns (uint64) {
        return startReleaseHeight;
    }

    function notifyDeposit(address user, uint256 amount) onlyMasterChef override external returns (bool){
        require(block.number<=startReleaseHeight, "FarmRewardLock: should not deposit after startReleaseHeight");
        lockedUsersSKB[user] = lockedUsersSKB[user].add(amount);

        emit DepositSKB(user, amount);
        return true;
    }

    function unlockedAmount(address userAddr) public view returns (uint256) {
        if (block.number <= startReleaseHeight) {
            return 0;
        } else if (block.number > startReleaseHeight.add(releasePeriod)) {
            return lockedUsersSKB[userAddr];
        }
        return block.number.sub(startReleaseHeight).mul(lockedUsersSKB[userAddr])/releasePeriod;
    }

    function claim() external returns (bool){
        require(block.number > startReleaseHeight, "FarmRewardLock: startReleaseHeight is still not reached");
        skb.safeTransfer(_msgSender(), unlockedAmount(_msgSender()));
        return true;
    }
}