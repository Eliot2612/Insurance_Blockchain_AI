include "InsurancePolicy.dfy"
include "InsuranceClaim.dfy"
include "Escrow.dfy"
module InsurancePaymentModule {
  import InsurancePolicy = InsurancePolicyModule
  import InsuranceClaim = InsuranceClaimModule
  import Escrow = EscrowModule
  type Address = nat
 
 
  class InsurancePayment {
    var admin: Address
    var policyContract: InsurancePolicy.InsurancePolicyContract
    var policyClaimsContract: InsuranceClaim.InsuranceClaimsContract
    var escrowContract: Escrow.EscrowContract
    // Change the key type to match the policy identifier type:
 
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
 
    method payPremium(caller: Address, policyId: InsurancePolicy.PolicyId, msg_value: nat)
        requires policyId in policyContract.policies
        requires escrowContract.policyContract == policyContract
        modifies escrowContract, policyContract, policyContract.policies.Values
        {
        // Retrieve the policy.
        var pol := policyContract.GetPolicy(policyId);
        
        // Check that the caller is the policy holder and the policy is not expired.
        if pol.policyHolder != caller || pol.status == InsurancePolicy.Expired {
            return;
        }
        
        if msg_value != pol.premium {
            return;
        }
        
        var success := escrowContract.depositFunds(caller, policyId, msg_value);
        if success == false {
            return;
        }
        
        assert policyId in policyContract.policies;
        var escrowBalance := escrowContract.getBalance(caller, policyId);
        
        if pol.status == InsurancePolicy.PendingPayment {
            if !(escrowBalance >= pol.premium) {
                return;
            }
            policyContract.ActivatePolicy(caller, policyId);
            escrowContract.releaseFunds(policyId);
        } else if pol.status == InsurancePolicy.Active { //should be active but will do that later
            if !(escrowBalance >= pol.premium) {
                return;
            }
            policyContract.RenewActivePolicy(caller, policyId, msg_value);
            escrowContract.releaseFunds(policyId);
        }
        
        
        }


  }
}