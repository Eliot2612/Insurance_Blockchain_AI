include "InsurancePolicy.dfy"
include "InsuranceClaim.dfy"
include "Escrow.dfy"
module InsurancePayoutModule {
  import InsurancePolicy = InsurancePolicyModule
  import InsuranceClaim = InsuranceClaimModule
  import Escrow = EscrowModule
  type Address = nat
 
 
  class InsurancePayout {
    var admin: Address
    var policyContract: InsurancePolicy.InsurancePolicyContract
    var policyClaimsContract: InsuranceClaim.InsuranceClaimsContract
    var escrowContract: Escrow.EscrowContract
    // Change the key type to match the policy identifier type:
    var policyBalances: map<InsurancePolicy.PolicyId, nat>
 
    constructor(a: Address, policyContract: InsurancePolicy.InsurancePolicyContract,
     policyClaims: InsuranceClaim.InsuranceClaimsContract, escrowContract: Escrow.EscrowContract)
      ensures admin == a
      ensures this.policyContract == policyContract
      ensures this.policyClaimsContract == policyClaims
      ensures this.escrowContract == escrowContract
    {
      admin := a;
      this.policyContract := policyContract;
      this.policyClaimsContract := policyClaims;
      this.escrowContract := escrowContract;
    }
 
    method processPayout(caller: Address, msg_value: nat, claimId: InsuranceClaim.ClaimId)
        requires caller == admin || (caller in policyContract.employees.Keys && policyContract.employees[caller])
        requires claimId in policyClaimsContract.claims
        requires policyClaimsContract.claims[claimId].ClaimStatus == InsuranceClaim.Approved
        requires policyClaimsContract.claims[claimId].amount == msg_value
        requires policyClaimsContract.claims[claimId].policyId in policyContract.policies
        requires escrowContract.policyContract == policyContract
        requires escrowContract.admin == admin
        requires policyClaimsContract.admin == admin
        requires policyClaimsContract.policyContract == policyContract
        modifies escrowContract, policyClaimsContract.claims.Values, policyClaimsContract
        {
        
        // Assert that the policy id is in escrowContract.policyBalances.
        var pid := policyClaimsContract.claims[claimId].policyId;
        var success := escrowContract.depositFunds(caller, pid, msg_value);
        if success {
            policyClaimsContract.updateClaim(caller, claimId, InsuranceClaim.Claimed);
            escrowContract.releaseFunds(pid);
        }
        }

  }
}