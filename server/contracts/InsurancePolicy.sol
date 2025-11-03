// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract InsurancePolicy {

    address public immutable admin;

    enum PolicyStatus { PendingPayment, Active, Expired }

    struct Policy {
        address policyHolder;  
        uint96 premium;        
        uint96 sumInsured;
        uint40 startDate;
        uint40 endDate;
        PolicyStatus status;
        bool exists; // Dafny addition
    }

    mapping(bytes32 => Policy) public policies;
    mapping(address => bool) public employees;

    // Events 
    event PolicyCreated(bytes32 indexed policyId, address indexed policyHolder, uint96 premium, uint40 startDate, uint40 endDate);
    event PolicyActivated(bytes32 indexed policyId);
    event PolicyRenewed(bytes32 indexed policyId, uint40 newEndDate, uint96 newSumInsured);
    event PolicyDeactivated(bytes32 indexed policyId);
    event EmployeeAdded(address indexed employee);
    event PolicyPaid(bytes32 indexed policyId, uint40 newEndDate, uint96 newSumInsured);

    constructor() {
        admin = msg.sender;
    }

    // Adds Employees to mapping of employees who are verified users 
    function addEmployee(address _employee) external {
        if (msg.sender != admin) revert("Not admin");
        employees[_employee] = true;
        emit EmployeeAdded(_employee);
    }

    // Creating a base insurance policy without activation 
    function createPolicy(address _policyHolder, uint96 _premium) external returns (bytes32) {
        //if (msg.sender != admin && !employees[msg.sender]) revert("Not authorised");
        uint40 startDate = uint40(block.timestamp);
        uint40 endDate = startDate + 30 days;
        bytes32 policyId = keccak256(abi.encodePacked(_policyHolder, startDate));

        policies[policyId] = Policy({
            policyHolder: _policyHolder,
            premium: _premium,
            sumInsured: 0,
            startDate: startDate,
            endDate: endDate,
            status: PolicyStatus.PendingPayment,
            exists: true
        });


        emit PolicyCreated(policyId, _policyHolder, _premium, startDate, endDate);
        return policyId;
    }

    // Activates policy after user payment or renew policy call 
    function activatePolicy(bytes32 _policyId, address _caller) external { // RBAC implemted through require statement
        Policy storage policy = policies[_policyId];
        require(policy.exists, "Policy does not exist"); // Dafny addition
        require(policy.status == PolicyStatus.PendingPayment, "Policy not in pending state");
        require(_caller == policy.policyHolder, "Only the policy holder can activate the policy");
        policy.sumInsured += policy.premium;
        policy.status = PolicyStatus.Active;
        
        emit PolicyActivated(_policyId);
    }

    // Pay premium for active policy 
    function payActivePolicy(bytes32 _policyId, uint96 _amount, address _caller) external {
        Policy storage policy = policies[_policyId];
        require(policy.exists, "Policy does not exist"); // Dafny addition
        require(policy.status == PolicyStatus.Active, "Policy is not active");
        require(_caller == policy.policyHolder, "Only the policy holder can pay for the policy");

        policy.sumInsured += _amount;
        policy.endDate = uint40(block.timestamp + 30 days);

        emit PolicyPaid(_policyId, policy.endDate, policy.sumInsured);
}

    // Renew Policy 
    function renewPolicy(bytes32 _policyId, uint96 _premium, address _caller) external { // RBAC implemted through require statement
        Policy storage policy = policies[_policyId];
        require(policy.exists, "Policy does not exist"); // Dafny addition
        require(_caller == policy.policyHolder, "Only the policy holder can renew the policy");
        require(policy.status == PolicyStatus.Expired, "Policy not expired");
        policy.sumInsured += _premium;
        policy.endDate = uint40(block.timestamp + 30 days);
        policy.status = PolicyStatus.Active;

        emit PolicyRenewed(_policyId, policy.endDate, policy.sumInsured);
    }

    // Makes policy Inactive/Expired 
    function deactivatePolicy(bytes32 _policyId) external {
        if (msg.sender != admin && !employees[msg.sender]) revert("Not authorised");
        require(policies[_policyId].exists, "Policy does not exist"); // Dafny addition
        policies[_policyId].status = PolicyStatus.Expired;
        emit PolicyDeactivated(_policyId);
    }

    // Get method for returning an individual Policy
    function getPolicy(bytes32 _policyId) external view returns (Policy memory) {
        require(policies[_policyId].exists, "Policy does not exist"); // Dafny addition
        return policies[_policyId];
    }

    // Checks if address correpsonds to an employee
    function isEmployee(address _address) external view returns (bool) {
       return employees[_address];
    }
}
