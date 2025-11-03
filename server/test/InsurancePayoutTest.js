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

describe("InsurancePayOut", function () {
  let insurancePolicy, escrow, insuranceClaims, insurancePayOut;
  let admin, employee, user, unauthorized;
  let policyId, claimId;
  const premium = 1000;

  beforeEach(async function () {
    [admin, employee, user, unauthorized] = await ethers.getSigners();

    const InsurancePolicyFactory = await ethers.getContractFactory("InsurancePolicy", admin);
    insurancePolicy = await InsurancePolicyFactory.deploy();
    await insurancePolicy.waitForDeployment();

    const EscrowFactory = await ethers.getContractFactory("Escrow", admin);
    escrow = await EscrowFactory.deploy(insurancePolicy.target);
    await escrow.waitForDeployment();

    const InsuranceClaimsFactory = await ethers.getContractFactory("InsuranceClaims", admin);
    insuranceClaims = await InsuranceClaimsFactory.deploy(insurancePolicy.target);
    await insuranceClaims.waitForDeployment();

    const InsurancePayOutFactory = await ethers.getContractFactory("InsurancePayOut", admin);
    insurancePayOut = await InsurancePayOutFactory.deploy(
      insurancePolicy.target,
      escrow.target,
      insuranceClaims.target
    );
    await insurancePayOut.waitForDeployment();

    let tx = await insurancePolicy.createPolicy(user.address, premium);
    let receipt = await tx.wait();
    let event = decodeEvent(receipt, "PolicyCreated", insurancePolicy.interface);
    policyId = event.args.policyId;

    tx = await insuranceClaims.logClaim(policyId, ethers.parseEther("1"), 90);
    receipt = await tx.wait();
    event = decodeEvent(receipt, "ClaimLogged", insuranceClaims.interface);
    claimId = event.args.claimId;

    await insurancePolicy.addEmployee(employee.address);
  });

  describe("processPayout", function () {
    it("Process payout correctly when called by admin", async function () {
      await insuranceClaims.updateClaimStatus(claimId, 1, admin.address);
      let claim = await insuranceClaims.getClaim(claimId);
      expect(claim.status).to.equal(1);
      const initialClaimantBalance = await ethers.provider.getBalance(user.address);
      const tx = await insurancePayOut.processPayout(claimId, { value: ethers.parseEther("1") });
      const receipt = await tx.wait();
      const fundsDepositedEvent = decodeEvent(receipt, "FundsDeposited", insurancePayOut.interface);
      const claimPaidEvent = decodeEvent(receipt, "ClaimPaid", insurancePayOut.interface);

      expect(fundsDepositedEvent).to.not.be.undefined;
      expect(fundsDepositedEvent.args.policyId).to.equal(claimId);
      expect(fundsDepositedEvent.args.amount).to.equal(ethers.parseEther("1"));

      expect(claimPaidEvent).to.not.be.undefined;
      expect(claimPaidEvent.args.policyId).to.equal(claimId);
      expect(claimPaidEvent.args.claimant).to.equal(user.address);
      expect(claimPaidEvent.args.amount).to.equal(ethers.parseEther("1"));

      claim = await insuranceClaims.getClaim(claimId);
      expect(claim.status).to.equal(3);
      const finalClaimantBalance = await ethers.provider.getBalance(user.address);
      expect(finalClaimantBalance).to.be.gt(initialClaimantBalance);
    });

    it("Process payout correctly when called by an employee", async function () {
      await insuranceClaims.updateClaimStatus(claimId, 1, admin.address);
      let claim = await insuranceClaims.getClaim(claimId);
      expect(claim.status).to.equal(1);
      const initialClaimantBalance = await ethers.provider.getBalance(user.address);
      const tx = await insurancePayOut.connect(employee).processPayout(claimId, { value: ethers.parseEther("1") });
      const receipt = await tx.wait();
      const fundsDepositedEvent = decodeEvent(receipt, "FundsDeposited", insurancePayOut.interface);
      const claimPaidEvent = decodeEvent(receipt, "ClaimPaid", insurancePayOut.interface);

      expect(fundsDepositedEvent).to.not.be.undefined;
      expect(fundsDepositedEvent.args.policyId).to.equal(claimId);
      expect(fundsDepositedEvent.args.amount).to.equal(ethers.parseEther("1"));

      expect(claimPaidEvent).to.not.be.undefined;
      expect(claimPaidEvent.args.policyId).to.equal(claimId);
      expect(claimPaidEvent.args.claimant).to.equal(user.address);
      expect(claimPaidEvent.args.amount).to.equal(ethers.parseEther("1"));

      claim = await insuranceClaims.getClaim(claimId);
      expect(claim.status).to.equal(3);
      const finalClaimantBalance = await ethers.provider.getBalance(user.address);
      expect(finalClaimantBalance).to.be.gt(initialClaimantBalance);
    });

    it("Revert if claim is not approved", async function () {
      await expect(
        insurancePayOut.processPayout(claimId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Claim is not approved");
    });

    it("Revert if payout amount is incorrect", async function () {
      await insuranceClaims.updateClaimStatus(claimId, 1, admin.address);
      await expect(
        insurancePayOut.processPayout(claimId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Incorrect payout amount");
    });

    it("Revert if caller is not admin or employee", async function () {
      await expect(
        insurancePayOut.connect(unauthorized).processPayout(claimId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Not authorised");
    });
  });
});
