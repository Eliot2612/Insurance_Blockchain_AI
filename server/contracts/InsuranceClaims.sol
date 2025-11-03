// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IInsurancePolicy.sol";

contract InsuranceClaims {
    address public immutable admin;
    IInsurancePolicy public  immutable insurancePolicy;

    enum ClaimStatus { Pending, Approved, Rejected, Claimed }

    struct Claim {
        bytes32 policyId;
        address claimant;
        uint96 amount;
        uint40 dateFiled; 
        uint8 mlValidationScore;
        ClaimStatus status;
        bool exists; // Dafny addition
    }

    mapping(bytes32 => Claim) public claims;
    mapping(bytes32 => bytes32[]) private policyClaims;

    event ClaimLogged(bytes32 indexed claimId, bytes32 indexed policyId, address indexed claimant, uint96 amount, ClaimStatus status);
    event ClaimStatusUpdated(bytes32 indexed claimId, ClaimStatus status, address caller);

    modifier onlyAdminOrEmployee() {
        require(msg.sender == admin || insurancePolicy.isEmployee(msg.sender), "Not authorised");
        _;
    }

    constructor(address _insurancePolicyAddress) {
        admin = msg.sender;
        insurancePolicy = IInsurancePolicy(_insurancePolicyAddress);
    }

    // Adds processed claim to blockchain.
    function logClaim(bytes32 _policyId, uint96 _amount, uint8 _mlValidationScore) external onlyAdminOrEmployee returns (bytes32 claimId) {
        uint40 timestamp = uint40(block.timestamp);
        IInsurancePolicy.Policy memory policy = insurancePolicy.getPolicy(_policyId);
        claimId = keccak256(abi.encodePacked(_policyId, policy.policyHolder, timestamp));

        claims[claimId] = Claim({
            policyId: _policyId,
            claimant: policy.policyHolder,
            amount: _amount,
            dateFiled: timestamp,
            status: ClaimStatus.Pending,
            mlValidationScore: _mlValidationScore,
            exists: true
        });

        policyClaims[_policyId].push(claimId);

        emit ClaimLogged(claimId, _policyId, policy.policyHolder, _amount, ClaimStatus.Pending);

        return claimId;
    }

    function updateClaimStatus(bytes32 _claimId, ClaimStatus _newStatus, address _caller) external {
        require(
            _caller == admin || 
            insurancePolicy.isEmployee(_caller),
            "Access restricted to admin and employees"
    );
        require(claims[_claimId].exists, "Claim does not exist"); // Dafny addition
        claims[_claimId].status = _newStatus;
        emit ClaimStatusUpdated(_claimId, _newStatus, _caller);
    }

    function getClaim(bytes32 _claimId) external view returns (Claim memory) {
        require(claims[_claimId].exists, "Claim does not exist"); // Dafny addition
        return claims[_claimId];
    }


    function getClaimsByPolicy(bytes32 _policyId) external view returns (bytes32[] memory) {
        IInsurancePolicy.Policy memory policy = insurancePolicy.getPolicy(_policyId);
        require(msg.sender == policy.policyHolder, "Sender is not policy holder");
        require(policyClaims[_policyId].length > 0, "Claim does not exist"); // Dafny addition
        return policyClaims[_policyId];
    }
}
