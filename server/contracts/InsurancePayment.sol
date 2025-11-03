// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IInsurancePolicy.sol";
import "./IEscrow.sol";

contract InsurancePayment {

    address public immutable admin;
    IInsurancePolicy public insurancePolicy;
    IEscrow public escrow;

    // Escrow balance per policy ID
    mapping(bytes32 => uint256) public policyBalances;

    // Events
    event PaymentReceived(address indexed policyHolder, uint96 amount, bytes32 indexed policyId);
    event PolicyPayout(bytes32 indexed policyId, address indexed recipient, uint96 amount);


    constructor(address _insurancePolicyAddress, address _escrowAddress) {
        admin = msg.sender;
        insurancePolicy = IInsurancePolicy(_insurancePolicyAddress);
        escrow = IEscrow(_escrowAddress);
    }

    // Pay premium function (funds stored in escrow contract)
    function payPremium(bytes32 _policyId) external payable {
        IInsurancePolicy.Policy memory policy = insurancePolicy.getPolicy(_policyId);

        address caller = msg.sender;

        // Pre-condition to execute successful funciton call
        if (caller != policy.policyHolder) revert("Not Policy Holder");
        if (policy.status == IInsurancePolicy.PolicyStatus.Expired) revert("Policy expired, renew your policy");

        uint96 paymentAmount = uint96(msg.value);
        if (paymentAmount != policy.premium) revert("Incorrect premium amount");

        escrow.depositFunds{value: uint96(msg.value)}(_policyId, caller);
        emit PaymentReceived(caller, uint96(msg.value), _policyId);

        // Escrow balance
        uint256 escrowBalance = escrow.getBalance(_policyId, caller);

        // Checks if policy is in pending status
        if (policy.status == IInsurancePolicy.PolicyStatus.PendingPayment) {
            require(escrowBalance >= policy.premium, "Insufficient escrow balance for activation");
            insurancePolicy.activatePolicy(_policyId, caller);
            // Release funds from escrow
            escrow.releaseFunds(_policyId, payable(admin));
        }
        // Checks if policy is in active state
        else if (policy.status == IInsurancePolicy.PolicyStatus.Active) {
            require(escrowBalance >= policy.premium, "Insufficient escrow balance for renewal");
            insurancePolicy.payActivePolicy(_policyId, uint96(msg.value), caller);
            // Release funds from escrow
            escrow.releaseFunds(_policyId, payable(admin));
        }
    }

    // Renew Policy function (only for expired policies)
    function renewPolicy(bytes32 _policyId) external payable {
        IInsurancePolicy.Policy memory policy = insurancePolicy.getPolicy(_policyId);

        address caller = msg.sender;

        // Pre-condition to execute successful funciton call
        if (caller != policy.policyHolder) revert("Not Policy Holder");
        if (policy.status != IInsurancePolicy.PolicyStatus.Expired) revert("Policy is not expired");

        uint96 renewalAmount = uint96(msg.value);
        if (renewalAmount != policy.premium) revert("Incorrect renewal amount");

        escrow.depositFunds{value: uint96(msg.value)}(_policyId, caller);
        insurancePolicy.renewPolicy(_policyId, uint96(msg.value), caller);
        escrow.releaseFunds(_policyId, payable(admin));

    }

    // Fallback function
    receive() external payable {}
}
