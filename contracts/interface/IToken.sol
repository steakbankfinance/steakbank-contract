pragma solidity ^0.6.0;

interface IToken {

    function mintTo(address to, uint256 amount) external returns (bool);

    function burn(uint256 amount) external returns (bool);
}
