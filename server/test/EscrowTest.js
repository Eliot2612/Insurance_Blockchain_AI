const { ethers } = require("hardhat");
const { expect } = require("chai");
const { utils } = ethers;

// policyBalances mapping is private, so cannot test the getBalance function
// getBalance must work as intended for tests to pass

function decodeEvent(receipt, eventName, contractInterface) {
  const decodedEvents = receipt.logs
    .map((log) => {
      try {
        return contractInterface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter((e) => e !== null);
  return decodedEvents.find((e) => e.name === eventName);
}

describe("Escrow", function () {
  let insurancePolicy, escrow;
  let admin, employee, user, unauthorized;
  let policyId;

  beforeEach(async function () {
    [admin, employee, user, unauthorized] = await ethers.getSigners();

    const InsurancePolicyFactory = await ethers.getContractFactory("InsurancePolicy", admin);
    insurancePolicy = await InsurancePolicyFactory.deploy();
    await insurancePolicy.waitForDeployment();

    const EscrowFactory = await ethers.getContractFactory("Escrow", admin);
    escrow = await EscrowFactory.deploy(insurancePolicy.target);
    await escrow.waitForDeployment();

    await insurancePolicy.addEmployee(employee.address);

    const premium = 1000;
    const tx = await insurancePolicy.createPolicy(user.address, premium);
    const receipt = await tx.wait();
    const event = decodeEvent(receipt, "PolicyCreated", insurancePolicy.interface);
    policyId = event.args.policyId;
  });

  describe("depositFunds", function () {
    it("Allow admin to deposit funds and increment balance", async function () {
        const initialBalance = await escrow.getBalance(policyId, admin.address);
        await expect(escrow.depositFunds(policyId, admin.address, { value: ethers.parseEther("1") }))
            .to.not.be.reverted;
        const newBalance = await escrow.getBalance(policyId, admin.address);
        expect(newBalance).to.equal(initialBalance + ethers.parseEther("1"));
    });

    it("Allow employee to deposit funds and increment balance", async function () {
        await insurancePolicy.addEmployee(employee.address);
        const initialBalance = await escrow.getBalance(policyId, employee.address);
        await expect(escrow.connect(employee).depositFunds(policyId, employee.address, { value: ethers.parseEther("1") }))
            .to.not.be.reverted;
        const newBalance = await escrow.getBalance(policyId, employee.address);
        expect(newBalance).to.equal(initialBalance + ethers.parseEther("1"));
    });

    it("Allow policy holder to deposit funds and increment balance", async function () {
        const initialBalance = await escrow.getBalance(policyId, user.address);
        await expect(escrow.depositFunds(policyId, user.address, { value: ethers.parseEther("1") }))
            .to.not.be.reverted;
        const newBalance = await escrow.getBalance(policyId, user.address);
        expect(newBalance).to.equal(initialBalance + ethers.parseEther("1"));
    });

    it("Revert if an unauthorized user deposits funds", async function () {
        await expect(
            escrow.connect(unauthorized).depositFunds(policyId, unauthorized.address, { value: ethers.parseEther("1") })
        ).to.be.revertedWith("Access restricted");
    });
  });

  describe("releaseFunds", function () {
    it("Release funds to the recipient and reset balance", async function () {
      await escrow.depositFunds(policyId, admin.address, { value: ethers.parseEther("1") });
      const initialRecipientBalance = await ethers.provider.getBalance(user.address);
      const tx = await escrow.releaseFunds(policyId, user.address);
      await tx.wait();

      const finalRecipientBalance = await ethers.provider.getBalance(user.address);
      expect(finalRecipientBalance).to.be.gt(initialRecipientBalance);

      const balanceAfter = await escrow.getBalance(policyId, admin.address);
      expect(balanceAfter).to.equal(0);
    });
  });
});
