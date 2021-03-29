pragma solidity 0.6.12;

import "../interface/IPancakeRouter.sol";

contract MockPancakeRouter is IPancakeRouter {

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
        return new uint[](0);
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override payable returns (uint[] memory amounts){
        return new uint[](0);
    }
}