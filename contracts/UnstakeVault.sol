pragma solidity 0.6.12;

import "./interface/IVault.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

contract UnstakeVault is IVault, ReentrancyGuard {
    address payable public stakingBank;

    event Deposit(address from, uint256 amount);
    event Withdraw(address recipient, uint256 amount);

    constructor(address payable stakingBankAddr) public {
        stakingBank = stakingBankAddr;
    }

    /* solium-disable-next-line */
    receive() external payable{
        emit Deposit(msg.sender, msg.value);
    }

    modifier onlyStakingBank() {
        require(msg.sender == stakingBank, "only stakingBank is allowed");
        _;
    }

    function claimBNB(uint256 amount, address payable recipient) nonReentrant onlyStakingBank override external returns(uint256){
        if (address(this).balance < amount) {
            amount = address(this).balance;
        }
        recipient.transfer(amount);
        emit Withdraw(recipient, amount);
        return amount;
    }
}