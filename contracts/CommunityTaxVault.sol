pragma solidity 0.6.12;

import "./interface/IVault.sol";
import "./interface/IPancakeRouter.sol";
import "./interface/IMintBurnToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol";

contract CommunityTaxVault is IVault, ReentrancyGuard {
    using SafeMath for uint256;

    address public governor;
    address public lbnbAddr;
    address public sbfAddr;
    address public wethAddr;
    address public busdAddr;
    address public pancakeRouterAddr;

    event Deposit(address from, uint256 amount);
    event Withdraw(address recipient, uint256 amount);
    event BuyAndBurnSBF(uint256 burnedSBFAmount, uint256 costBNBAmount, uint256 costLBNBAmount);
    event GovernorshipTransferred(address oldGovernor, address newGovernor);

    constructor(address payable _govAddr, address _lbnbAddr, address _sbfAddr, address _wethAddr, address _busdAddr, address _pancakeRouterAddr) public {
        governor = _govAddr;
        lbnbAddr = _lbnbAddr;
        sbfAddr = _sbfAddr;
        wethAddr = _wethAddr;
        busdAddr = _busdAddr;
        pancakeRouterAddr = _pancakeRouterAddr;
    }

    receive () external payable {
        emit Deposit(msg.sender, msg.value);
    }

    modifier onlyGov() {
        require(msg.sender == governor, "only governance is allowed");
        _;
    }

    function transferGovernorship(address newGovernor) external {
        require(msg.sender == governor, "only governor is allowed");
        require(newGovernor != address(0), "new governor is zero address");
        governor = newGovernor;
        emit GovernorshipTransferred(governor, newGovernor);
    }

    function claimBNB(uint256 amount, address payable recipient) nonReentrant onlyGov override external returns(uint256) {
        if (address(this).balance < amount) {
            amount = address(this).balance;
        }
        recipient.transfer(amount);
        emit Withdraw(recipient, amount);
        return amount;
    }

    function setPancakeRouterAddr(address newPancakeRouterAddr) onlyGov external {
        pancakeRouterAddr = newPancakeRouterAddr;
    }

    function buyAndBurnSBF() nonReentrant onlyGov external returns(bool) {
        address[] memory path = new address[](3);
        path[1]=busdAddr;
        path[2]=sbfAddr;

        uint256 bnbBalance = address(this).balance;
        if (bnbBalance > 0) {
            path[0]=wethAddr;
            IPancakeRouter(pancakeRouterAddr).swapExactETHForTokens{value: bnbBalance}(0, path, address(this), block.timestamp+1);
        }
        uint256 costBNBAmount = bnbBalance.sub(address(this).balance);

        uint256 lbnbBalance = IBEP20(lbnbAddr).balanceOf(address(this));
        if (lbnbBalance > 0) {
            path[0]=lbnbAddr;
            uint256 allowance = IBEP20(lbnbAddr).allowance(address(this), pancakeRouterAddr);
            if (allowance < lbnbBalance) {
                IBEP20(lbnbAddr).approve(pancakeRouterAddr, lbnbBalance);
            }
            IPancakeRouter(pancakeRouterAddr).swapExactTokensForTokens(lbnbBalance, 0, path, address(this), block.timestamp+1);
        }
        uint256 costLBNBAmount = lbnbBalance.sub(IBEP20(lbnbAddr).balanceOf(address(this)));

        uint256 sbfBalance = IBEP20(sbfAddr).balanceOf(address(this));
        if (sbfBalance>0) {
            IMintBurnToken(sbfAddr).burn(sbfBalance);
        }
        emit BuyAndBurnSBF(sbfBalance, costBNBAmount, costLBNBAmount);
        return true;
    }
}