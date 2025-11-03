const { ethers } = require("hardhat");
const { expect } = require("chai");

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

describe("InsurancePolicy", function () {
  let insurancePolicy;
  let admin, employee, user;

  beforeEach(async function () {
    [admin, employee, user] = await ethers.getSigners();
    const InsurancePolicyFactory = await ethers.getContractFactory("InsurancePolicy", admin);
    insurancePolicy = await InsurancePolicyFactory.deploy();
    await insurancePolicy.waitForDeployment();
  });

  describe("addEmployee", function () {
    it("Allow admin to add an employee", async function () {
      const tx = await insurancePolicy.addEmployee(employee.address);
      const receipt = await tx.wait();
      const event = decodeEvent(receipt, "EmployeeAdded", insurancePolicy.interface);
      expect(event, "EmployeeAdded event not emitted").to.not.be.undefined;
      expect(event.args.employee).to.equal(employee.address);
      const isEmployee = await insurancePolicy.employees(employee.address);
      expect(isEmployee).to.be.true;
    });

    it("Revert when non-admin tries to add an employee", async function () {
      await expect(insurancePolicy.connect(employee).addEmployee(user.address)).to.be.revertedWith("Not admin");
    });
  });

  describe("createPolicy", function () {
    it("Allow admin to create a policy and store it in the mapping", async function () {
      const premium = 1000;
      const tx = await insurancePolicy.createPolicy(user.address, premium);
      const receipt = await tx.wait();
      const event = decodeEvent(receipt, "PolicyCreated", insurancePolicy.interface);
      expect(event, "PolicyCreated event not emitted").to.not.be.undefined;
      const { policyId, policyHolder, premium: eventPremium } = event.args;
      expect(policyHolder).to.equal(user.address);
      expect(eventPremium).to.equal(premium);
      const storedPolicyDirect = await insurancePolicy.policies(policyId);
      expect(storedPolicyDirect.policyHolder).to.equal(user.address);
      expect(storedPolicyDirect.premium).to.equal(premium);
      expect(storedPolicyDirect.sumInsured).to.equal(0);
      expect(storedPolicyDirect.status).to.equal(0);
    });

    it("Allow an employee to create a policy and store it in the mapping", async function () {
      await insurancePolicy.addEmployee(employee.address);
      const premium = 2000;
      const tx = await insurancePolicy.connect(employee).createPolicy(user.address, premium);
      const receipt = await tx.wait();
      const event = decodeEvent(receipt, "PolicyCreated", insurancePolicy.interface);
      expect(event, "PolicyCreated event not emitted").to.not.be.undefined;
      const { policyId, policyHolder, premium: eventPremium } = event.args;
      expect(policyHolder).to.equal(user.address);
      expect(eventPremium).to.equal(premium);
      const storedPolicyDirect = await insurancePolicy.policies(policyId);
      expect(storedPolicyDirect.policyHolder).to.equal(user.address);
      expect(storedPolicyDirect.premium).to.equal(premium);
      expect(storedPolicyDirect.sumInsured).to.equal(0);
      expect(storedPolicyDirect.status).to.equal(0);
    });

    it("Revert if called by an unauthorized address", async function () {
      const premium = 1500;
      await expect(insurancePolicy.connect(user).createPolicy(user.address, premium)).to.be.revertedWith("Not authorised");
    });
  });

  describe("getPolicy", function () {
    it("Return the correct policy details for a given policyId and match policies mapping", async function () {
      const premium = 1000;
      const createTx = await insurancePolicy.createPolicy(user.address, premium);
      const createReceipt = await createTx.wait();
      const event = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
      const policyId = event.args.policyId;
      const policyFromGetPolicy = await insurancePolicy.getPolicy(policyId);
      const policyFromMapping = await insurancePolicy.policies(policyId);
      expect(policyFromGetPolicy.policyHolder).to.equal(policyFromMapping.policyHolder);
      expect(policyFromGetPolicy.premium).to.equal(policyFromMapping.premium);
      expect(policyFromGetPolicy.sumInsured).to.equal(policyFromMapping.sumInsured);
      expect(policyFromGetPolicy.status).to.equal(policyFromMapping.status);
      expect(policyFromGetPolicy.startDate).to.equal(policyFromMapping.startDate);
      expect(policyFromGetPolicy.endDate).to.equal(policyFromMapping.endDate);
      expect(policyFromGetPolicy.policyHolder).to.equal(user.address);
      expect(policyFromGetPolicy.premium).to.equal(premium);
      expect(policyFromGetPolicy.sumInsured).to.equal(0);
      expect(policyFromGetPolicy.status).to.equal(0);
      expect(policyFromGetPolicy.startDate).to.be.gt(0);
      expect(policyFromGetPolicy.endDate).to.be.gt(policyFromGetPolicy.startDate);
    });
  });

  describe("activatePolicy", function () {
    it("Allow the policy holder to activate a pending policy", async function () {
      const premium = 1000;
      const createTx = await insurancePolicy.createPolicy(user.address, premium);
      const createReceipt = await createTx.wait();
      const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
      const policyId = policyCreatedEvent.args.policyId;
      const policyBefore = await insurancePolicy.policies(policyId);
      const activateTx = await insurancePolicy.activatePolicy(policyId, user.address);
      const activateReceipt = await activateTx.wait();
      const activateEvent = decodeEvent(activateReceipt, "PolicyActivated", insurancePolicy.interface);
      expect(activateEvent, "PolicyActivated event not emitted").to.not.be.undefined;
      expect(activateEvent.args.policyId).to.equal(policyId);
      const policyAfter = await insurancePolicy.policies(policyId);
      expect(policyAfter.status).to.equal(1);
      expect(policyAfter.sumInsured).to.equal(policyBefore.sumInsured + policyBefore.premium);
    });

    it("Revert if a non-policy holder tries to activate the policy", async function () {
      const premium = 1000;
      const createTx = await insurancePolicy.createPolicy(user.address, premium);
      const createReceipt = await createTx.wait();
      const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
      const policyId = policyCreatedEvent.args.policyId;
      await expect(insurancePolicy.activatePolicy(policyId, admin.address)).to.be.revertedWith("Only the policy holder can activate the policy");
    });

    it("Revert if trying to activate an already active policy", async function () {
      const premium = 1000;
      const createTx = await insurancePolicy.createPolicy(user.address, premium);
      const createReceipt = await createTx.wait();
      const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
      const policyId = policyCreatedEvent.args.policyId;
      await insurancePolicy.activatePolicy(policyId, user.address);
      await expect(insurancePolicy.activatePolicy(policyId, user.address)).to.be.revertedWith("Policy not in pending state");
    });
  });
  describe("deactivatePolicy", function () {
      it("should allow admin to deactivate a policy", async function () {
        const createTx = await insurancePolicy.createPolicy(user.address, 1000);
        const createReceipt = await createTx.wait();
        const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
        const policyId = policyCreatedEvent.args.policyId;

        const tx = await insurancePolicy.deactivatePolicy(policyId);
        const receipt = await tx.wait();
        const event = decodeEvent(receipt, "PolicyDeactivated", insurancePolicy.interface);
        expect(event, "PolicyDeactivated event not emitted").to.not.be.undefined;

        const policyFromGetPolicy = await insurancePolicy.getPolicy(policyId);

        expect(policyFromGetPolicy.status).to.equal(2);
      });

      it("should allow employee to deactivate a policy", async function () {
        await insurancePolicy.addEmployee(employee.address);
        const createTx = await insurancePolicy.connect(employee).createPolicy(user.address, 1000);
        const createReceipt = await createTx.wait();
        const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
        const policyId = policyCreatedEvent.args.policyId;

        const tx = await insurancePolicy.connect(employee).deactivatePolicy(policyId);
        const receipt = await tx.wait();
        const event = decodeEvent(receipt, "PolicyDeactivated", insurancePolicy.interface);
        expect(event, "PolicyDeactivated event not emitted").to.not.be.undefined;

        const policyFromGetPolicy = await insurancePolicy.getPolicy(policyId);

        expect(policyFromGetPolicy.status).to.equal(2);
      });

      it("should not allow user to deactivate a policy", async function () {
        const createTx = await insurancePolicy.createPolicy(user.address, 1000);
        const createReceipt = await createTx.wait();
        const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
        const policyId = policyCreatedEvent.args.policyId;

        await expect(insurancePolicy.connect(user).deactivatePolicy(policyId))
          .to.be.revertedWith("Not authorised");
      });
    });
  describe("renewPolicy", function () {
    it("Allow the policy holder to renew an expired policy", async function () {
      const premium = 1000;

      const createTx = await insurancePolicy.createPolicy(user.address, premium);
      const createReceipt = await createTx.wait();
      const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
      const policyId = policyCreatedEvent.args.policyId;

      await insurancePolicy.activatePolicy(policyId, user.address);

      await insurancePolicy.deactivatePolicy(policyId);

      const policyBefore = await insurancePolicy.policies(policyId);

      const renewTx = await insurancePolicy.renewPolicy(policyId, premium, user.address);
      const renewReceipt = await renewTx.wait();
      const renewEvent = decodeEvent(renewReceipt, "PolicyRenewed", insurancePolicy.interface);

      expect(renewEvent, "PolicyRenewed event not emitted").to.not.be.undefined;
      expect(renewEvent.args.policyId).to.equal(policyId);

      const policyAfter = await insurancePolicy.policies(policyId);

      expect(policyAfter.status).to.equal(1); // Active status
      expect(policyAfter.sumInsured).to.equal(policyBefore.sumInsured + BigInt(premium));
      expect(policyAfter.endDate).to.be.gt(policyBefore.endDate);
    });

    it("Revert if a non-policy holder tries to renew the policy", async function () {
      const premium = 1000;

      const createTx = await insurancePolicy.createPolicy(user.address, premium);
      const createReceipt = await createTx.wait();
      const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
      const policyId = policyCreatedEvent.args.policyId;

      await insurancePolicy.activatePolicy(policyId, user.address);
      await insurancePolicy.deactivatePolicy(policyId);

      await expect(insurancePolicy.renewPolicy(policyId, premium, admin.address))
        .to.be.revertedWith("Only the policy holder can renew the policy");
    });

    it("Revert if trying to renew a non-expired policy", async function () {
      const premium = 1000;

      const createTx = await insurancePolicy.createPolicy(user.address, premium);
      const createReceipt = await createTx.wait();
      const policyCreatedEvent = decodeEvent(createReceipt, "PolicyCreated", insurancePolicy.interface);
      const policyId = policyCreatedEvent.args.policyId;

      await insurancePolicy.activatePolicy(policyId, user.address);

      await expect(insurancePolicy.renewPolicy(policyId, premium, user.address))
        .to.be.revertedWith("Policy not expired");
    });
  });

});
