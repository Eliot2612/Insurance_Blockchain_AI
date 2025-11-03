// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IInsurancePolicy.sol";
import "./IEscrow.sol";
import "./IInsuranceClaims.sol";

contract InsurancePayOut {

    address public immutable admin;
    IEscrow public escrow;
    IInsurancePolicy public insurancePolicy;
    IInsuranceClaims public insuranceClaims;

    // Events 
    event ClaimPaid(bytes32 indexed policyId, address indexed claimant, uint96 amount);
    event FundsDeposited(bytes32 indexed policyId, uint96 amount);

    modifier onlyAdminOrEmployee() {
        require(msg.sender == admin || insurancePolicy.isEmployee(msg.sender), "Not authorised");
        _;
    }

    constructor(address _insurancePolicyAddress, address _escrowAddress, address _insuranceClaimsAddress) {
        admin = msg.sender;
        insurancePolicy = IInsurancePolicy(_insurancePolicyAddress);
        escrow = IEscrow(_escrowAddress);
        insuranceClaims = IInsuranceClaims(_insuranceClaimsAddress);
    }
    
    function processPayout(bytes32 _claimId) external payable onlyAdminOrEmployee {
        IInsuranceClaims.Claim memory claim = insuranceClaims.getClaim(_claimId);
        bytes32 policyId = claim.policyId;
        require(claim.status == IInsuranceClaims.ClaimStatus.Approved, "Claim is not approved");
        require(msg.value == claim.amount, "Incorrect payout amount");

        // Deposit funds to escrow
        bool success = escrow.depositFunds{value: uint96(msg.value)}(policyId, msg.sender);
        require(success, "Failed to deposit funds into escrow"); // Dafny addition
        emit FundsDeposited(_claimId, uint96(msg.value));

        // Update claim status to "Claimed"
        insuranceClaims.updateClaimStatus(_claimId, IInsuranceClaims.ClaimStatus.Claimed, msg.sender);

        // Release funds from escrow to claimant
        escrow.releaseFunds(policyId, payable(claim.claimant));
        emit ClaimPaid(_claimId, claim.claimant, uint96(claim.amount));
    }
}