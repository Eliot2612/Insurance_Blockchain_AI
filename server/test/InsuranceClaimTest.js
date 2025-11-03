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

describe("InsuranceClaims", function () {
  let insuranceClaims, insurancePolicy;
  let admin, employee, user;
  let policyId;
  const amount = 1000;
  const mlScore = 80;
  beforeEach(async function () {
    [admin, employee, user] = await ethers.getSigners();

    const InsurancePolicyFactory = await ethers.getContractFactory("InsurancePolicy", admin);
    insurancePolicy = await InsurancePolicyFactory.deploy();
    await insurancePolicy.waitForDeployment();

    const InsuranceClaimsFactory = await ethers.getContractFactory("InsuranceClaims", admin);
    insuranceClaims = await InsuranceClaimsFactory.deploy(insurancePolicy.target);
    await insuranceClaims.waitForDeployment();

    await insurancePolicy.addEmployee(employee.address);
    const premium = 1000;
    const tx = await insurancePolicy.createPolicy(user.address, premium);
    const receipt = await tx.wait();
    const event = decodeEvent(receipt, "PolicyCreated", insurancePolicy.interface);
    policyId = event.args.policyId;
  });

  describe("logClaim", function () {
      it("Allow admin to log a claim and store it in the mapping", async function () {
          const tx = await insuranceClaims.logClaim(policyId, amount, mlScore);
          const receipt = await tx.wait();
          const event = decodeEvent(receipt, "ClaimLogged", insuranceClaims.interface);
          expect(event, "ClaimLogged event not emitted").to.not.be.undefined;
          const { claimId, policyId: eventPolicyId, claimant, amount: eventAmount, status } = event.args;
          expect(eventPolicyId).to.equal(policyId);
          expect(claimant).to.equal(user.address);
          expect(eventAmount).to.equal(amount);
          expect(status).to.equal(0);
          const storedClaim = await insuranceClaims.claims(claimId);
          expect(storedClaim.policyId).to.equal(policyId);
          expect(storedClaim.claimant).to.equal(user.address);
          expect(storedClaim.amount).to.equal(amount);
          expect(storedClaim.status).to.equal(0);
      });

      it("Allow an employee to log a claim and store it in the mapping", async function () {
          await insurancePolicy.addEmployee(employee.address);

          const tx = await insuranceClaims.connect(employee).logClaim(policyId, amount, mlScore);
          const receipt = await tx.wait();
          const event = decodeEvent(receipt, "ClaimLogged", insuranceClaims.interface);
          expect(event, "ClaimLogged event not emitted").to.not.be.undefined;
          const { claimId, policyId: eventPolicyId, claimant, amount: eventAmount, status } = event.args;
          expect(eventPolicyId).to.equal(policyId);
          expect(claimant).to.equal(user.address);
          expect(eventAmount).to.equal(amount);
          expect(status).to.equal(0);
          const storedClaim = await insuranceClaims.claims(claimId);
          expect(storedClaim.policyId).to.equal(policyId);
          expect(storedClaim.claimant).to.equal(user.address);
          expect(storedClaim.amount).to.equal(amount);
          expect(storedClaim.status).to.equal(0);
      });

      it("Revert if called by an unauthorized address", async function () {

          await expect(insuranceClaims.connect(user).logClaim(policyId, amount, mlScore))
              .to.be.revertedWith("Not authorised");
      });
  });
  describe("getClaim", function () {
    it("Return the correct claim details for a given claimId and match claims mapping", async function () {
        const tx = await insuranceClaims.logClaim(policyId, amount, mlScore);
        const receipt = await tx.wait();
        const event = decodeEvent(receipt, "ClaimLogged", insuranceClaims.interface);
        const claimId = event.args.claimId;

        const claimFromGetClaim = await insuranceClaims.getClaim(claimId);
        const claimFromMapping = await insuranceClaims.claims(claimId);

        expect(claimFromGetClaim.policyId).to.equal(claimFromMapping.policyId);
        expect(claimFromGetClaim.claimant).to.equal(claimFromMapping.claimant);
        expect(claimFromGetClaim.amount).to.equal(claimFromMapping.amount);
        expect(claimFromGetClaim.status).to.equal(claimFromMapping.status);
        expect(claimFromGetClaim.dateFiled).to.equal(claimFromMapping.dateFiled);
        expect(claimFromGetClaim.mlValidationScore).to.equal(claimFromMapping.mlValidationScore);

        expect(claimFromGetClaim.policyId).to.equal(policyId);
        expect(claimFromGetClaim.claimant).to.equal(user.address);
        expect(claimFromGetClaim.amount).to.equal(amount);
        expect(claimFromGetClaim.status).to.equal(0);
        expect(claimFromGetClaim.dateFiled).to.be.gt(0);
        expect(claimFromGetClaim.mlValidationScore).to.equal(mlScore);
        });
    });
  describe("getClaimsByPolicy", function () {
      it("Return the logged claim id and getClaim returns matching claim details", async function () {
        const tx = await insuranceClaims.logClaim(policyId, amount, mlScore);
        const receipt = await tx.wait();
        const event = decodeEvent(receipt, "ClaimLogged", insuranceClaims.interface);
        const claimId = event.args.claimId;

        const claimIds = await insuranceClaims.connect(user).getClaimsByPolicy(policyId);
        expect(claimIds.length).to.equal(1);
        expect(claimIds[0]).to.equal(claimId);

        const claimDetails = await insuranceClaims.getClaim(claimId);
        expect(claimDetails.policyId).to.equal(policyId);
        expect(claimDetails.claimant).to.equal(user.address);
        expect(claimDetails.amount).to.equal(amount);
        expect(claimDetails.status).to.equal(0);
        expect(claimDetails.mlValidationScore).to.equal(mlScore);
      });

      it("Revert when called by a non-policy holder", async function () {
        await expect(insuranceClaims.connect(admin).getClaimsByPolicy(policyId)).to.be.reverted;
      });
    });
    describe("updateClaimStatus", function () {
      it("Allow admin to update claim status", async function () {
        const tx = await insuranceClaims.logClaim(policyId, amount, mlScore);
        const receipt = await tx.wait();
        const event = decodeEvent(receipt, "ClaimLogged", insuranceClaims.interface);
        const claimId = event.args.claimId;
        const newStatus = 1;
        const updateTx = await insuranceClaims.updateClaimStatus(claimId, newStatus, admin.address);
        const updateReceipt = await updateTx.wait();
        const updateEvent = decodeEvent(updateReceipt, "ClaimStatusUpdated", insuranceClaims.interface);

        expect(updateEvent, "ClaimStatusUpdated event not emitted").to.not.be.undefined;
        expect(updateEvent.args.claimId).to.equal(claimId);
        expect(updateEvent.args.status).to.equal(newStatus);

        const updatedClaim = await insuranceClaims.getClaim(claimId);
        expect(updatedClaim.status).to.equal(newStatus);
      });

      it("Allow an employee to update claim status", async function () {
        await insurancePolicy.addEmployee(employee.address);

        const tx = await insuranceClaims.connect(employee).logClaim(policyId, amount, mlScore);
        const receipt = await tx.wait();
        const event = decodeEvent(receipt, "ClaimLogged", insuranceClaims.interface);
        const claimId = event.args.claimId;
        const newStatus = 2;
        const updateTx = await insuranceClaims.updateClaimStatus(claimId, newStatus, employee.address);
        const updateReceipt = await updateTx.wait();
        const updateEvent = decodeEvent(updateReceipt, "ClaimStatusUpdated", insuranceClaims.interface);

        expect(updateEvent, "ClaimStatusUpdated event not emitted").to.not.be.undefined;
        expect(updateEvent.args.claimId).to.equal(claimId);
        expect(updateEvent.args.status).to.equal(newStatus);

        const updatedClaim = await insuranceClaims.getClaim(claimId);
        expect(updatedClaim.status).to.equal(newStatus);
      });

      it("Revert if called by a non-admin and non-employee", async function () {
        const tx = await insuranceClaims.logClaim(policyId, amount, mlScore);
        const receipt = await tx.wait();
        const event = decodeEvent(receipt, "ClaimLogged", insuranceClaims.interface);
        const claimId = event.args.claimId;
        const newStatus = 1;
        await expect(
          insuranceClaims.updateClaimStatus(claimId, newStatus, user.address)
        ).to.be.revertedWith("Access restricted to admin and employees");
      });
    });

});
