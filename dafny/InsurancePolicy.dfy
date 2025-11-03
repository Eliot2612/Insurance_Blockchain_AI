module InsurancePolicyModule {

  type Address = nat


  datatype PolicyStatus = 
    | PendingPayment 
    | Active 
    | Expired


  class Policy {
    var policyHolder: Address
    var premium: nat
    var sumInsured: nat
    var startDate: nat
    var endDate: nat
    var status: PolicyStatus
  }


  datatype PolicyId = PolicyId(policyHolder: Address, startDate: nat, endDate: nat)

  // Class represents the contract, allows for a similar constructor style from Solidity
  class InsurancePolicyContract {
    var admin: Address
    var employees: map<Address, bool>
    var policies: map<PolicyId, Policy>
    
    
    const contract_duration: nat := 30

    // Constructor: the deployer becomes the admin.
    constructor(a: Address)
      ensures admin == a
      ensures employees == map[]
      ensures policies == map[]
    {
      admin := a;
      employees := map[];
      policies := map[];
    }

    // Adding an employee, only callable by authorised admin
    method AddEmployee(caller: Address, employee: Address)
      requires caller == admin
      modifies this
      ensures employee in employees && employees[employee] == true
    {
      employees := employees[employee := true];
      
    }

    // Create a new policy, callable by admin only who is a registered employee
    // 0 is a placeholder value for current time
    method CreatePolicy(caller: Address, policyHolder: Address, premium: nat) returns (policyId: PolicyId)
      requires caller == admin || (caller in employees && employees[caller])
      modifies this
      ensures policyId == PolicyId(policyHolder, 0, 0 + contract_duration)
    {
      var startDate := 0;
      var endDate := startDate + contract_duration;
      policyId := PolicyId(policyHolder, startDate, endDate);
      var newPolicy := new Policy;
      newPolicy.policyHolder := policyHolder;
      newPolicy.premium := premium;
      newPolicy.sumInsured := 0;
      newPolicy.startDate := startDate;
      newPolicy.endDate := endDate;
      newPolicy.status := PendingPayment;
      policies := policies[policyId := newPolicy];
    }

    // Ensures that this does not delete/add policies
    method ActivatePolicy(caller: Address, policyId: PolicyId)
      requires policyId in policies
      requires policies[policyId].status == PendingPayment
      requires caller == policies[policyId].policyHolder
      ensures policies.Keys == old(policies).Keys
      modifies this, policies.Values
    {
      var p := policies[policyId];
      p.status := Active;
    }

    // Renew a policy, only if the status is expired
    // Uses 0 as a placeholder for current time
    // Ensures that this does not delete/add policies
    method RenewPolicy(caller: Address, policyId: PolicyId, additionalSum: nat)
      requires policyId in policies
      requires caller == policies[policyId].policyHolder
      requires policies[policyId].status == Expired
      modifies this, policies.Values
      ensures policies.Keys == old(policies).Keys
      ensures policies[policyId].endDate == 0 + contract_duration
    {
      var p := policies[policyId];
      var currentTime := 0; 
      p.sumInsured := p.sumInsured + additionalSum;
      p.endDate := currentTime + contract_duration;
      // Event PolicyRenewed omitted.
    }

    method RenewActivePolicy(caller: Address, policyId: PolicyId, additionalSum: nat)
      requires policyId in policies
      requires caller == policies[policyId].policyHolder
      requires policies[policyId].status == Active
      modifies this, policies.Values
      ensures policies.Keys == old(policies).Keys
      ensures policies[policyId].endDate == 0 + contract_duration
    {
      var p := policies[policyId];
      var currentTime := 0; 
      p.sumInsured := p.sumInsured + additionalSum;
      p.endDate := currentTime + contract_duration;
      // Event PolicyRenewed omitted.
    }

    // Ends a policy by setting the status to expired
    // Only callable by an admin who is an employee
    method DeactivatePolicy(caller: Address, policyId: PolicyId)
      requires caller == admin || (caller in employees && employees[caller])
      requires policyId in policies
      modifies this, policies.Values
    {
      var p := policies[policyId];
      p.status := Expired;
      
    }

    // Returns a policy based on the policy ID
    // Does NOT modify the policy mapping data, as it's a read function
    method GetPolicy(policyId: PolicyId) returns (p: Policy)
      requires policyId in policies
      ensures p == old(policies)[policyId]
      ensures policies == old(policies)
    {
      p := policies[policyId];
    }

    // Checks if an address belongs to an employee
    // Does NOT modify the employee mapping data, as it's a read function
    method IsEmployee(addr: Address) returns (res: bool)
        ensures res == (addr in employees && employees[addr])
        ensures employees == old(employees)
    {
      if addr in employees {
        res := employees[addr];
      } else {
        res := false;
        }
    }
  }
}
