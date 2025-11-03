// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface IInsuranceClaims {
    enum ClaimStatus { Pending, Approved, Rejected, Claimed }

    struct Claim {
        bytes32 policyId;
        address claimant;
        uint96 amount;
        uint40 dateFiled; 
        uint8 mlValidationScore;
        ClaimStatus status;
        bool exists;
    }

    function getClaim(bytes32 _claimId) external view returns (Claim memory);
    function updateClaimStatus(bytes32 _claimId, ClaimStatus _newStatus, address _caller) external;
}