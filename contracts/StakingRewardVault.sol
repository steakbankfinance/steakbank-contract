pragma solidity 0.6.12;

import "./interface/IVault.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";

contract StakingRewardVault is IVault, Initializable{
    address payable public stakeBNBAgent;

    event ReceiveDeposit(address from, uint256 amount);

    constructor() public {
    }

    function initialize(address payable stakeBNBAgentAddr) public initializer{
        stakeBNBAgent = stakeBNBAgentAddr;
    }

    modifier onlyFromStakeBNBAgent() {
        require(msg.sender == stakeBNBAgent, "only stakeBNBAgent is allowed");
        _;
    }

    receive() external payable{
        emit ReceiveDeposit(msg.sender, msg.value);
    }

    function claimBNB(uint256 amount, address payable recipient) override external onlyFromStakeBNBAgent returns(uint256) {
        if (address(this).balance < amount) {
            amount = address(this).balance;
        }
        recipient.transfer(amount);
        return amount;
    }
}