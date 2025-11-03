const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("EscrowModule", (m) => {

  const Escrow = m.contract("Escrow", ["0x5FbDB2315678afecb367f032d93F642f64180aa3"], {
  });

  return { Escrow };
});
