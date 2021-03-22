pragma solidity 0.6.12;

import "./interface/IVault.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

contract StakingRewardVault is IVault, ReentrancyGuard {
    address payable public stakeBank;

    event Deposit(address from, uint256 amount);
    event Withdraw(address recipient, uint256 amount);

    constructor(address payable stakeBankAddr) public {
        stakeBank = stakeBankAddr;
    }

    /* solium-disable-next-line */
    receive() external payable{
        emit Deposit(msg.sender, msg.value);
    }

    modifier onlyStakeBank() {
        require(msg.sender == stakeBank, "only stakeBank is allowed");
        _;
    }

    function claimBNB(uint256 amount, address payable recipient) nonReentrant onlyStakeBank override external returns(uint256) {
        if (address(this).balance < amount) {
            amount = address(this).balance;
        }
        recipient.transfer(amount);
        emit Withdraw(recipient, amount);
        return amount;
    }
}