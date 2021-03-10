pragma solidity 0.6.12;

import "./interface/IVault.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

contract CommunityTaxVault is IVault, Initializable, ReentrancyGuard {

    mapping(uint64 => uint256) public communityTaxEachDay;
    address public governor;

    event ReceiveDeposit(address from, uint256 amount);
    event GovernorshipTransferred(address oldGovernor, address newGovernor);

    constructor() public {
    }

    receive() external payable{
        emit ReceiveDeposit(msg.sender, msg.value);
    }

    function initialize(address payable govAddr) public initializer{
        governor = govAddr;
    }

    modifier onlyGov() {
        require(msg.sender == governor, "only governance is allowed");
        _;
    }

    function transferGovernorship(address newGovernor) external {
        require(msg.sender == governor, "only governor is allowed");
        require(newGovernor != address(0), "new governor is the zero address");
        governor = newGovernor;
        emit GovernorshipTransferred(governor, newGovernor);
    }

    function claimBNB(uint256 amount, address payable recipient) onlyGov override external returns(uint256) {
        if (address(this).balance < amount) {
            amount = address(this).balance;
        }
        recipient.transfer(amount);
        return amount;
    }
}