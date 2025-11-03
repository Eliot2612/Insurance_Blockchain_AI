import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import Sidebar from "../components/Sidebar";

import InsurancePayout from "../artifacts/contracts/InsurancePayout.sol/InsurancePayOut.json";
import InsuranceClaims from "../artifacts/contracts/InsuranceClaims.sol/InsuranceClaims.json";

const insuranceClaimsAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const insurancePayOutAddress = "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9";

const AdminPage = () => {
  const navigate = useNavigate();
  const [claimId, setClaimId] = useState("");
  const [loading, setLoading] = useState(false);

  // State variables for claim creation
  const [policyId, setPolicyId] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimMLscore, setClaimMLscore] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [submittedClaimId, setSubmittedClaimId] = useState("");

  // State for updating claim status
  const [updateClaimId, setUpdateClaimId] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');

        if (role !== 'ADMIN') {
           navigate('/access-denied');
           return;
         }

  }, [navigate]);

  const handlePayout = async () => {
    if (!claimId.trim()) {
      alert("Enter a valid policy ID");
      return;
    }
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      setLoading(true);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const payoutContract = new ethers.Contract(
        insurancePayOutAddress,
        InsurancePayout.abi,
        signer
      );
      await payoutContract.deployed();

      const claimsContract = new ethers.Contract(
        insuranceClaimsAddress,
        InsuranceClaims.abi,
        signer
      );
      await claimsContract.deployed();
      console.log("Claims contract deployed at:", claimsContract.address);

      if (!claimId.startsWith("0x") || claimId.length !== 66) {
        alert("Policy ID must be a valid 32-byte hex string (starting with 0x and 66 characters long).");
        return;
      }
      const claim = await claimsContract.getClaim(claimId);
      const claimAmountInEth = ethers.utils.formatEther(claim.amount);
      console.log("Retrieved claim:", claimAmountInEth);
      const tx = await payoutContract.processPayout(claimId, {
        value: claim.amount.toString(),
      })
      console.log("Amount transferred:", claim.amount.toString());
      await tx.wait();
      alert("Payout processed successfully.");
    } catch (error) {
      console.error("Error processing payout:", error);
      alert("Payout failed. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClaim = async () => {
    if (!policyId.trim() || !claimAmount.trim() || !claimMLscore.trim()) {
      alert("All claim fields are required.");
      return;
    }
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      setClaimLoading(true);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Address of deployed InsuranceClaims contract
      const insuranceClaimsAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
      const contract = new ethers.Contract(
        insuranceClaimsAddress,
        InsuranceClaims.abi,
        signer
      );

      // Validate policyId as a 32-byte hex string
      if (!policyId.startsWith("0x") || policyId.length !== 66) {
        alert("Claim ID must be a valid 32-byte hex string (starting with 0x and 66 characters long).");
        return;
      }
      const formattedPolicyId = policyId;
      const parsedAmount = ethers.utils.parseEther(claimAmount.toString());
      console.log("parsedAmount: ", parsedAmount);
      const parsedMLScore = parseInt(claimMLscore, 10);

      console.log("Submitting claim with details:");
      console.log("Claim ID:", formattedPolicyId);
      console.log("Claim Amount:", parsedAmount.toString());
      console.log("ML Score:", parsedMLScore);

      const tx = await contract.logClaim(formattedPolicyId, parsedAmount, parsedMLScore);
      const receipt = await tx.wait();

      if (receipt.events) {
        const claimLoggedEvent = receipt.events.find(
          (event) => event.event === "ClaimLogged"
        );
        if (claimLoggedEvent) {
          const emittedClaimId = claimLoggedEvent.args.claimId;
          console.log("ClaimLogged event captured. Claim ID:", emittedClaimId);
          setSubmittedClaimId(emittedClaimId);
        } else {
          console.log("ClaimLogged event not found in receipt.");
        }
      }
      alert("Claim created successfully.");
    } catch (error) {
      console.error("Error creating claim:", error);
      alert("Failed to create claim.");
    } finally {
      setClaimLoading(false);
    }
  };

  const handleAcceptClaim = async () => {
    if (!updateClaimId.startsWith("0x") || updateClaimId.length !== 66) {
      alert("Claim ID must be a valid 32-byte hex string.");
      return;
    }
    try {
      setUpdateLoading(true);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const insuranceClaimsAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
      const contract = new ethers.Contract(
        insuranceClaimsAddress,
        InsuranceClaims.abi,
        signer
      );

      // Approved is enum index 1
      const tx = await contract.updateClaimStatus(updateClaimId, 1, await signer.getAddress());
      await tx.wait();
      alert("Claim accepted successfully.");
    } catch (error) {
      console.error("Error accepting claim:", error);
      alert("Failed to accept claim.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeclineClaim = async () => {
    if (!updateClaimId.startsWith("0x") || updateClaimId.length !== 66) {
      alert("Claim ID must be a valid 32-byte hex string.");
      return;
    }
    try {
      setUpdateLoading(true);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const insuranceClaimsAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
      const contract = new ethers.Contract(
        insuranceClaimsAddress,
        InsuranceClaims.abi,
        signer
      );

      // Rejected is enum index 2
      const tx = await contract.updateClaimStatus(updateClaimId, 2, await signer.getAddress());
      await tx.wait();
      alert("Claim declined successfully.");
    } catch (error) {
      console.error("Error declining claim:", error);
      alert("Failed to decline claim.");
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col md={3}>
          <Sidebar />
        </Col>
        <Col md={9} className="py-4">
          <h4 className="mb-4">Admin Dashboard</h4>

          {/* Payout Form */}
          <Card className="mb-3">
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Claim ID</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter claim ID"
                    value={claimId}
                    onChange={(e) => setClaimId(e.target.value)}
                  />
                </Form.Group>
                <Button variant="primary" onClick={handlePayout} disabled={loading}>
                  {loading ? "Processing..." : "Payout"}
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* Create Claim Form */}
          <Card className="mb-3">
            <Card.Body>
              <h5>Create Claim</h5>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Policy ID</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter policy ID"
                    value={policyId}
                    onChange={(e) => setPolicyId(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Claim Amount</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter claim amount"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Claim ML Score</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter claim ML score"
                    value={claimMLscore}
                    onChange={(e) => setClaimMLscore(e.target.value)}
                  />
                </Form.Group>
                <Button variant="primary" onClick={handleCreateClaim} disabled={claimLoading}>
                  {claimLoading ? "Creating Claim..." : "Submit Claim"}
                </Button>
              </Form>
              {submittedClaimId && (
                <p className="mt-3">
                  ClaimID is {submittedClaimId}, keep this safe.
                </p>
              )}
            </Card.Body>
          </Card>

          {/* Update Claim Status Form */}
          <Card className="mb-3">
            <Card.Body>
              <h5>Update Claim Status</h5>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Claim ID</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter claim ID"
                    value={updateClaimId}
                    onChange={(e) => setUpdateClaimId(e.target.value)}
                  />
                </Form.Group>
                <Button variant="success" onClick={handleAcceptClaim} disabled={updateLoading}>
                  {updateLoading ? "Processing..." : "Accept"}
                </Button>
                <Button variant="danger" onClick={handleDeclineClaim} disabled={updateLoading} className="ms-2">
                  {updateLoading ? "Processing..." : "Decline"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminPage;
