pragma solidity 0.6.12;

import "./interface/ICrossChain.sol";
import "./interface/IVault.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";

contract CommunityTaxVault is IVault, Initializable {
    address public governance;

    event ReceiveDeposit(address from, uint256 amount);

    constructor() public {
    }

    function initialize(address payable govAddr) public initializer{
        governance = govAddr;
    }

    modifier onlyGov() {
        require(msg.sender == governance, "only governance is allowed");
        _;
    }

    receive() external payable{
        emit ReceiveDeposit(msg.sender, msg.value);
    }

    function claimBNB(uint256 amount) override external onlyGov returns(uint256) {
        if (address(this).balance < amount) {
            amount = address(this).balance;
        }
        msg.sender.transfer(amount);
        return amount;
    }
}