pragma solidity 0.6.12;

import "./lib/BEP20.sol";
import "./interface/IMintBurnToken.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";

contract LBNBImpl is BEP20, IMintBurnToken, Initializable {

    constructor() public {}

    function initialize(string memory name, string memory symbol, uint8 decimals, uint256 initialSupply, address ownerAddr) public initializer {
        super.initializeBEP20(name, symbol, decimals, initialSupply, ownerAddr);
    }

    /// @notice Creates `_amount` token to `_to`. Must only be called by the owner (MasterChef).
    function mintTo(address _to, uint256 _amount) override external onlyOwner returns (bool){
        _mint(_to, _amount);
        return true;
    }

    /**
   * @dev Burn `amount` tokens and decreasing the total supply.
   */
    function burn(uint256 amount) override external returns (bool) {
        _burn(_msgSender(), amount);
        return true;
    }
}