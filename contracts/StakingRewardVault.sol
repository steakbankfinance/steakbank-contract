pragma solidity 0.6.12;

import "./interface/IVault.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

contract StakingRewardVault is IVault, ReentrancyGuard {
    address payable public stakeBNBAgent;

    event ReceiveDeposit(address from, uint256 amount);

    constructor(address payable stakeBNBAgentAddr) public {
        stakeBNBAgent = stakeBNBAgentAddr;
    }

    receive() external payable{
        emit ReceiveDeposit(msg.sender, msg.value);
    }

    modifier onlyFromStakeBNBAgent() {
        require(msg.sender == stakeBNBAgent, "only stakeBNBAgent is allowed");
        _;
    }

    function claimBNB(uint256 amount, address payable recipient) nonReentrant onlyFromStakeBNBAgent override external returns(uint256) {
        if (address(this).balance < amount) {
            amount = address(this).balance;
        }
        recipient.transfer(amount);
        return amount;
    }
}