pragma solidity 0.6.12;

import "../interface/IPancakeRouter.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract MockPancakeRouter is IPancakeRouter {

    using SafeERC20 for IERC20;

    address public lbnbAddr;
    address public sbfAddr;

    constructor(address _lbnbAddr, address _sbfAddr) public {
        lbnbAddr = _lbnbAddr;
        sbfAddr = _sbfAddr;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        IERC20(lbnbAddr).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 sbfAmount = IERC20(sbfAddr).balanceOf(address(this));
        IERC20(sbfAddr).safeTransfer(to, sbfAmount/2);
        return new uint[](0);
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override payable returns (uint[] memory amounts){
        uint256 sbfAmount = IERC20(sbfAddr).balanceOf(address(this));
        IERC20(sbfAddr).safeTransfer(to, sbfAmount/2);
        return new uint[](0);
    }
}