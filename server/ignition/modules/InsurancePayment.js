const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("InsurancePaymentModule", (m) => {

    const insurancePolicyAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
    const escrowAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  
    const InsurancePayment = m.contract("InsurancePayment", [insurancePolicyAddress, escrowAddress]);

  return { InsurancePayment };
});
