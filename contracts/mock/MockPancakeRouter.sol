pragma solidity 0.6.12;

import "../interface/IPancakeRouter.sol";

contract MockPancakeRouter is IPancakeRouter {

    address public lbnbAddr;
    address public sbfAddr;

    constructor(address _lbnbAddr, address _sbfAddr) public {
        lbnbAddr = _lbnbAddr;
        sbfAddr = _sbfAddr;
    }

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline) override external returns (uint[] memory amounts) {
        return new uint[](0);
    }

    function swapETHForExactTokens(
        uint amountOut,
        address[] calldata path,
        address to,
        uint deadline) override external payable returns (uint[] memory amounts) {
        return new uint[](0);
    }
}