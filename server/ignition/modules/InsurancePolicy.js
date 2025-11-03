const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("InsurancePolicyModule", (m) => {

  const InsurancePolicy= m.contract("InsurancePolicy", [], {
  });

  return { InsurancePolicy };
});
