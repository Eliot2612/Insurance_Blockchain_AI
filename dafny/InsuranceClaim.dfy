include "InsurancePolicy.dfy"
 
module InsuranceClaimModule {
  import InsurancePolicy = InsurancePolicyModule
  type Address = nat
 
  datatype ClaimStatus =
    | Pending
    | Approved
    | Rejected
    | Claimed
 
  class Claim {
    var policyId: InsurancePolicy.PolicyId
    var claimant: Address
    var amount: nat
    var dateFiled: nat
    var ClaimStatus: ClaimStatus
    var mlValidationScore: nat
  }
 
  datatype ClaimId = ClaimId(policyId: InsurancePolicy.PolicyId, msg_sender: Address, timestamp: nat)
 
  class InsuranceClaimsContract {
    var admin: Address
    var policyContract: InsurancePolicy.InsurancePolicyContract
    var claims: map<ClaimId, Claim>
    var claimIDs: map<InsurancePolicy.PolicyId, ClaimId>
 
 
    constructor(a: Address, policyContract: InsurancePolicy.InsurancePolicyContract)
      ensures admin == a
      ensures this.policyContract == policyContract
    {
      admin := a;
      this.policyContract := policyContract;
      claims := map[];
      claimIDs := map[];
    }
 
    method logClaim(caller: Address, Claimant: Address, policyId: InsurancePolicy.PolicyId, amount: nat, mlValidationScore: nat)
      returns (logged_claimId: ClaimId)
      requires (caller in policyContract.employees.Keys && policyContract.employees[caller])
      modifies this
    {
      var newClaim := new Claim;
      newClaim.policyId := policyId;
      newClaim.claimant := Claimant;
      newClaim.amount := amount;
      newClaim.dateFiled := 0;  // dummy timestamp
      newClaim.mlValidationScore := mlValidationScore;
      var claimId := ClaimId(policyId, caller, 0);
      claims := claims[claimId := newClaim];
      claimIDs := claimIDs[policyId := claimId];
      logged_claimId := claimId;
    }
 
    method updateClaim(caller: Address, claimId: ClaimId, new_claimStatus: ClaimStatus)
      requires caller == admin || (caller in policyContract.employees.Keys && policyContract.employees[caller])
      requires claimId in claims
      modifies this, claims.Values
      ensures claims.Keys == old(claims).Keys
      ensures claims[claimId].ClaimStatus == new_claimStatus
    {
      var c := claims[claimId];
      c.ClaimStatus := new_claimStatus;
    }
   
    // Moved inside the class so that "claims" is in scope.
    method getClaim(claimId: ClaimId) returns (retClaim: Claim)
      requires claimId in claims
      ensures claims.Keys == old(claims).Keys
    {
      retClaim := claims[claimId];
    }
    method getClaimsByPolicy(policyId: InsurancePolicy.PolicyId) returns (retClaimId: ClaimId)
      requires policyId in claimIDs
      ensures claimIDs.Keys == old(claimIDs).Keys
    {
      retClaimId := claimIDs[policyId];
    }
  }
}