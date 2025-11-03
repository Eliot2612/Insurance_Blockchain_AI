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

describe("InsurancePayment", function () {
  let insurancePolicy, escrow, insuranceClaims, insurancePayment;
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

    const InsuranceClaimsFactory = await ethers.getContractFactory("InsuranceClaims", admin);
    insuranceClaims = await InsuranceClaimsFactory.deploy(insurancePolicy.target);
    await insuranceClaims.waitForDeployment();

    const InsurancePaymentFactory = await ethers.getContractFactory("InsurancePayment", admin);
    insurancePayment = await InsurancePaymentFactory.deploy(
      insurancePolicy.target,
      escrow.target
    );
    await insurancePayment.waitForDeployment();

    const tx = await insurancePolicy.createPolicy(user.address, ethers.parseEther("1"));
    const receipt = await tx.wait();
    const event = decodeEvent(receipt, "PolicyCreated", insurancePolicy.interface);
    policyId = event.args.policyId;
  });


  describe("payPremium", function () {
    it("Revert if caller is not the policy holder", async function () {
      await expect(
        insurancePayment.connect(admin).payPremium(policyId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Not Policy Holder");
    });

    it("Revert if the policy is expired", async function () {

      await insurancePolicy.deactivatePolicy(policyId);
      await expect(
        insurancePayment.connect(user).payPremium(policyId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Policy expired, renew your policy");
    });

    it("Revert if the premium amount does not match the paid amount", async function () {
      await expect(
        insurancePayment.connect(user).payPremium(policyId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Incorrect premium amount");
    });

    it("Process payPremium correctly for a pending policy", async function () {
      const tx = await insurancePayment.connect(user).payPremium(policyId, { value: ethers.parseEther("1") });
      const receipt = await tx.wait();
      const paymentEvent = decodeEvent(receipt, "PaymentReceived", insurancePayment.interface);

      expect(paymentEvent).to.not.be.undefined;
      expect(paymentEvent.args.policyHolder).to.equal(user.address);
      expect(paymentEvent.args.amount).to.equal(ethers.parseEther("1"));
      expect(paymentEvent.args.policyId).to.equal(policyId);


      const escrowBalance = await escrow.getBalance(policyId, user.address);
      expect(escrowBalance).to.equal(0);

      const policy = await insurancePolicy.getPolicy(policyId);
      expect(policy.status).to.equal(1);
    });

    it("Process payPremium correctly for an active policy", async function () {

      const tx = await insurancePayment.connect(user).payPremium(policyId, { value: ethers.parseEther("1") });
      const receipt = await tx.wait();
      const paymentEvent = decodeEvent(receipt, "PaymentReceived", insurancePayment.interface);

      expect(paymentEvent).to.not.be.undefined;
      expect(paymentEvent.args.policyHolder).to.equal(user.address);
      expect(paymentEvent.args.amount).to.equal(ethers.parseEther("1"));
      expect(paymentEvent.args.policyId).to.equal(policyId);

      const escrowBalance = await escrow.getBalance(policyId, user.address);
      expect(escrowBalance).to.equal(0);

      policy = await insurancePolicy.getPolicy(policyId);
      expect(policy.sumInsured).to.equal(ethers.parseEther("1"));
    });
  });
  describe("renewPolicy", function () {
    it("Revert if caller is not the policy holder", async function () {
      await insurancePolicy.deactivatePolicy(policyId);
      await expect(
        insurancePayment.connect(admin).renewPolicy(policyId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Not Policy Holder");
    });

    it("Revert if policy is not expired", async function () {
      await expect(
        insurancePayment.connect(user).renewPolicy(policyId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Policy is not expired");
    });

    it("Revert if renewal amount does not match premium", async function () {
      await insurancePolicy.deactivatePolicy(policyId);
      await expect(
        insurancePayment.connect(user).renewPolicy(policyId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Incorrect renewal amount");
    });

    it("Process renewPolicy correctly for an expired policy", async function () {
      await insurancePolicy.deactivatePolicy(policyId);

      const tx = await insurancePayment.connect(user).renewPolicy(policyId, { value: ethers.parseEther("1") });
      await tx.wait();

      const escrowBalance = await escrow.getBalance(policyId, user.address);
      expect(escrowBalance).to.equal(0);

      const policy = await insurancePolicy.getPolicy(policyId);
      expect(policy.status).to.equal(1);
    });
  });

});
