pragma solidity 0.6.12;

import "../lib/Ownable.sol";

import "@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol";

contract SBFRewardVault is Ownable {
    using SafeBEP20 for IBEP20;

    IBEP20 public sbf;

    constructor(
        IBEP20 _sbf,
        address _owner
    ) public {
        sbf = _sbf;
        super.initializeOwner(_owner);
    }

    function safeTransferSBF(address recipient, uint256 amount) onlyOwner external returns (uint256){
        uint256 balance = sbf.balanceOf(address(this));
        if (balance>=amount) {
            sbf.safeTransfer(recipient, amount);
            return amount;
        } else {
            sbf.safeTransfer(recipient, balance);
            return balance;
        }
    }
}