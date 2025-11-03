import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

// Import ABI Code
import InsurancePolicy from "../artifacts/contracts/InsurancePolicy.sol/InsurancePolicy.json";
import InsurancePayment from "../artifacts/contracts/InsurancePayment.sol/InsurancePayment.json";

const DashboardPage = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [recentClaim, setRecentClaim] = useState(null);
  const [loading, setLoading] = useState(true);

  // Policy ID state + local storage
  const [policyId, setPolicyId] = useState(null);
  useEffect(() => {
    const storedId = localStorage.getItem('myPolicyId');
    if (storedId) {
      setPolicyId(storedId);
    }
  }, []);

  // Create policy on chain
  const handleCreatePolicy = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed. Please install it to continue.");
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      // Contract addresses
      const policyContractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
      const paymentContractAddress = "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9";

      const policyContract = new ethers.Contract(
        policyContractAddress,
        InsurancePolicy.abi,
        signer
      );
      const paymentContract = new ethers.Contract(
        paymentContractAddress,
        InsurancePayment.abi,
        signer
      );

      // Convert propertyDetails.ethHouseValue to WEI
      const premiumWei = ethers.utils.parseEther(
        (propertyDetails.premium || 0).toString()
      );

      // Create policy
      const tx = await policyContract.createPolicy(user.wallet_address, premiumWei);
      const receipt = await tx.wait();

      // Extract the PolicyCreated event
      const policyCreatedEvent = receipt.events?.find(
        (event) => event.event === "PolicyCreated"
      );
      const onChainPolicyId = policyCreatedEvent?.args?.policyId;

      // Store policyId locally
      setPolicyId(onChainPolicyId);
      localStorage.setItem('myPolicyId', onChainPolicyId);

      alert(`Policy created! Policy ID: ${onChainPolicyId}. Paying premium now...`);

      // Pay premium
      const payTx = await paymentContract.payPremium(onChainPolicyId, {
        value: premiumWei,
      });
      await payTx.wait();

      alert("Premium paid successfully!");
    } catch (error) {
      console.error("Error:", error.stack);
      alert("Failed to create policy or pay premium.");
    }
  };

  // Fetch user/property/claim
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          navigate('/login');
          return;
        }
        // Fetch user
        const userResponse = await fetch('http://127.0.0.1:8000/api/user/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userResponse.ok) {
          setUser(await userResponse.json());
        }

        // Fetch property
        const propertyResponse = await fetch('http://127.0.0.1:8000/api/property/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (propertyResponse.ok) {
          setPropertyDetails(await propertyResponse.json());
        }

        // Fetch recent claim
        const claimResponse = await fetch('http://127.0.0.1:8000/api/recent-claim/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (claimResponse.ok) {
          setRecentClaim(await claimResponse.json());
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  return (
    <Container fluid>
      <Row>
        <Col md={3}>
          <Sidebar />
        </Col>
        <Col md={9} className="py-4">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              {/* Property Card */}
              <Card className="mb-3" style={styles.card}>
                {propertyDetails ? (
                  <div style={styles.propertyContainer}>
                    <div style={styles.iconContainer}>🏠</div>
                    <div style={styles.propertyText}>
                      <h5 style={styles.propertyTitle}>Property details:</h5>
                      <div style={styles.propertyInfo}>
                        <p>
                          <strong>Address:</strong>{' '}
                          {`${propertyDetails.address}, ${propertyDetails.city}, ${propertyDetails.postcode}, ${propertyDetails.country}`}
                        </p>
                        <p>
                          <strong>House type:</strong>{' '}
                          {propertyDetails.house_type || 'Not provided'}
                        </p>
                        <p>
                          <strong>Number of occupants:</strong>{' '}
                          {propertyDetails.occupants}
                        </p>
                      </div>
                    </div>
                    <div style={styles.propertyRisk}>
                      <strong>Risk level:</strong>{' '}
                      <span style={styles.riskValue}>
                        {propertyDetails.riskLevel || 'Calculating...'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.emptyMessage}>
                    <p>
                      <strong>No property details found.</strong> Please update your property details{' '}
                      <a href="/edit-details" style={styles.link}>here</a>.
                    </p>
                  </div>
                )}
              </Card>

              {/* Policy Card */}
              <Card className="mb-3" style={styles.card}>
                <Row className="align-items-center">
                  <Col>
                    <h5>Policy</h5>
                    {policyId ? (
                      <p><strong>Policy ID:</strong> {policyId}</p>
                    ) : (
                      <p>No policy found or not yet created.</p>
                    )}
                    {propertyDetails && propertyDetails.premium ? (
                      <p><strong>Premium:</strong> {propertyDetails.premium} ETH</p>
                    ) : (
                      <p>Premium not set. Please update property details.</p>
                    )}
                  </Col>
                  <Col className="text-end">
                    <Button
                      variant="success"
                      size="sm"
                      style={styles.button}
                      onClick={handleCreatePolicy}
                    >
                      Pay your policy
                    </Button>
                  </Col>
                </Row>
              </Card>

              {/* Recent Claim Card */}
              <Card className="mb-3" style={styles.card}>
                <Row>
                  <Col>
                    <h5>Your Most Recent Claim</h5>
                    {recentClaim ? (
                      <div style={styles.claimDetails}>
                        <p><strong>Claim ID:</strong> {recentClaim.claim_id}</p>
                        <p><strong>Disaster Type:</strong> {recentClaim.disaster_type}</p>
                        <p><strong>Status:</strong> {recentClaim.status}</p>
                        <p><strong>Description:</strong></p>
                        <p style={styles.description}>{recentClaim.description}</p>
                      </div>
                    ) : (
                      <p>No claims submitted yet.</p>
                    )}
                  </Col>
                  <Col className="d-flex flex-column align-items-end">
                    <Button
                      variant="success"
                      size="sm"
                      style={styles.button}
                      onClick={() => navigate('/new-claim')}
                    >
                      Start New Claim
                    </Button>
                  </Col>
                </Row>
              </Card>

              {/* Claim History Card */}
              <Card className="mb-3" style={styles.card}>
                <Row className="align-items-center">
                  <Col>
                    <h5>Claim History</h5>
                  </Col>
                  <Col className="text-end">
                    <Button
                      variant="success"
                      size="sm"
                      style={styles.button}
                      onClick={() => navigate('/claims-history')}
                    >
                      More Details
                    </Button>
                  </Col>
                </Row>
              </Card>
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
};

const styles = {
  card: {
    padding: '20px',
    borderRadius: '8px',
    backgroundColor: '#F5F5F5',
    border: '1px solid #ddd'
  },
  button: {
    backgroundColor: '#3E7046',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 15px',
    width: '160px',
    textAlign: 'center'
  },
  propertyContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  iconContainer: {
    fontSize: '28px'
  },
  propertyText: {
    flex: 1
  },
  propertyTitle: {
    fontWeight: '600',
    marginBottom: '8px'
  },
  propertyInfo: {
    fontSize: '14px',
    lineHeight: '1.5'
  },
  propertyRisk: {
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#3E7046'
  },
  riskValue: {
    color: '#DC3545'
  },
  emptyMessage: {
    padding: '15px',
    backgroundColor: '#F8D7DA',
    color: '#721C24',
    border: '1px solid #F5C6CB',
    borderRadius: '5px'
  },
  link: {
    color: '#3E7046',
    textDecoration: 'underline',
    cursor: 'pointer'
  },
  claimDetails: {
    marginTop: '15px',
    fontSize: '14px'
  },
  description: {
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    marginBottom: '15px'
  }
};

export default DashboardPage;
