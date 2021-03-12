pragma solidity ^0.6.0;

interface IFarmRewardLock {

    function getStartReleaseHeight() external returns (uint64);

    function notifyDeposit(address user, uint256 amount) external returns (bool);

}