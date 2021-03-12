pragma solidity ^0.6.0;

interface ITokenHub {

  function getMiniRelayFee() external view returns(uint256);

  function transferOut(address contractAddr, address recipient, uint256 amount, uint64 expireTime)
    external payable returns (bool);
}


