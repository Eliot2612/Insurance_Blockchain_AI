// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IEscrow.sol";
import "./IInsurancePolicy.sol"; 

contract Escrow is IEscrow {

    address immutable public admin;
    IInsurancePolicy public insurancePolicy;

    mapping(bytes32 => uint256) private policyBalances;

    constructor(address _insurancePolicyAddress) {
        admin = msg.sender;
        insurancePolicy = IInsurancePolicy(_insurancePolicyAddress);
    }

    // Deposit funds into the escrow for a given policy ID
    function depositFunds(bytes32 _policyId, address _caller) external payable override returns (bool) {
        IInsurancePolicy.Policy memory policy = insurancePolicy.getPolicy(_policyId);
        if (_caller != admin && !insurancePolicy.isEmployee(_caller) && _caller != policy.policyHolder) {
            revert("Access restricted");
        }
        policyBalances[_policyId] += uint96(msg.value);
        return true;
    }


    // Release funds from the escrow to the recipient
    function releaseFunds(bytes32 _policyId, address payable recipient) external override {
        uint256 balance = policyBalances[_policyId];

        delete policyBalances[_policyId];
        recipient.transfer(balance);
    }

    // Get the balance of escrow funds for a given policy ID
    function getBalance(bytes32 _policyId, address _caller) external view override returns (uint256) {
        IInsurancePolicy.Policy memory policy = insurancePolicy.getPolicy(_policyId);

        if (_caller != admin && !insurancePolicy.isEmployee(_caller) && _caller != policy.policyHolder) {
            revert("Access restricted");
        }
        return policyBalances[_policyId];
    }

    receive() external payable {}
}
