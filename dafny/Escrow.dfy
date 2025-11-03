include "InsurancePolicy.dfy"
 
module EscrowModule {
  import InsurancePolicy = InsurancePolicyModule
  type Address = nat
 
 
  class EscrowContract {
    var admin: Address
    var policyContract: InsurancePolicy.InsurancePolicyContract
    // Change the key type to match the policy identifier type:
    var policyBalances: map<InsurancePolicy.PolicyId, nat>
 
    constructor(a: Address, policyContract: InsurancePolicy.InsurancePolicyContract)
      ensures admin == a
      ensures this.policyContract == policyContract
    {
      admin := a;
      this.policyContract := policyContract;
      policyBalances := map[];
    }
 
    method depositFunds(caller: Address, policyId: InsurancePolicy.PolicyId, msg_value: nat)
        returns (success: bool)
        requires policyId in policyContract.policies
        requires caller == admin
                || (caller in policyContract.employees.Keys && policyContract.employees[caller])
                || caller == policyContract.policies[policyId].policyHolder
        ensures policyId in policyBalances
        ensures policyContract.policies.Keys == old(policyContract.policies).Keys
        modifies this
        {
        var currentBalance := if policyId in policyBalances then policyBalances[policyId] else 0;
        policyBalances := policyBalances + map[policyId := currentBalance + msg_value];
        success := true;
        return success;
        }
 
    method releaseFunds(policyId: InsurancePolicy.PolicyId)
      requires policyId in policyBalances
      modifies this
    {
      // Dummy transfer line, e.g., transfer funds to recipient
      // recipient.transfer(policyBalances[policyId]);
      policyBalances := policyBalances - {policyId};
    }
    method getBalance(caller: Address, policyId: InsurancePolicy.PolicyId)
        returns (balanceRetrieved: nat)
        requires policyId in policyContract.policies
        requires policyId in policyBalances
        
        ensures policyBalances.Keys == old(policyBalances).Keys
        ensures policyContract.policies.Keys == old(policyContract.policies).Keys
        modifies this
        {
        // If policyId isn't in policyBalances, we assume a default balance of 0.
        balanceRetrieved := policyBalances[policyId];
        }
  }
}