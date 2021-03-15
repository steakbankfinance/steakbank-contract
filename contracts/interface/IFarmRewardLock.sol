pragma solidity ^0.6.0;

interface IFarmRewardLock {

    function getLockEndHeight() external view returns (uint256);

    function notifyDeposit(address user, uint256 amount) external returns (bool);

}