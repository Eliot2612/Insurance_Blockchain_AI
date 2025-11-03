// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface IInsurancePolicy {
    enum PolicyStatus { PendingPayment, Active, Expired }

    struct Policy {
        address policyHolder;  
        uint96 premium;        
        uint96 sumInsured;
        uint40 startDate;
        uint40 endDate;
        PolicyStatus status;
        bool exists;
    }

    function payActivePolicy(bytes32 _policyId, uint96 _premium, address _caller) external;
    function activatePolicy(bytes32 _policyId, address _caller) external;
    function renewPolicy(bytes32 _policyId, uint96 _premium, address _caller) external;
    function getPolicy(bytes32 _policyId) external view returns (Policy memory);
    function isEmployee(address _employee) external view returns (bool);
}