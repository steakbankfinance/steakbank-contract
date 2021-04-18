pragma solidity 0.6.12;

import "../lib/BEP20.sol";

contract MockLPToken is BEP20 {

    constructor(address ownerAddr) public {
        super.initializeBEP20("Mock LP Token", "LP", 18, 1e8*1e18, ownerAddr);
    }
}