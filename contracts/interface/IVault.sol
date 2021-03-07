pragma solidity ^0.6.0;

interface IVault {

    function claimBNB(uint256 amount) external returns(uint256);

}