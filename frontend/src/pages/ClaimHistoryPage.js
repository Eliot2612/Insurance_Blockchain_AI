import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Dropdown, Badge} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const ClaimHistoryPage = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expandedClaims, setExpandedClaims] = useState({});
  const toggleExpand = (claimId) => {
    setExpandedClaims((prev) => ({ ...prev, [claimId]: !prev[claimId] }));
  };
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };

  const formatStatus = (status) => {
    if (!status) return '';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.error('No auth token found');
          navigate('/login');
          return;
        }

        const response = await fetch('http://127.0.0.1:8000/api/claims/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 401) {
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setClaims(data);
      } catch (error) {
        console.error('Error fetching claims:', error);
      }
    };

    fetchClaims();
  }, [navigate]);

  const filteredClaims = claims.filter(
    (claim) => filter === 'All' || claim.disaster_type === filter
  );

  return (
    <Container fluid>
      <Row>
        <Col md={3}>
          <Sidebar />
        </Col>

        <Col md={9} className="py-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="dark"
            className="mb-3"
            style={styles.returnButton}
          >
            Return to dash
          </Button>

          <h4 className="mb-4">Claim History</h4>

          <div className="d-flex justify-content-end mb-3">
            <Dropdown>
              <Dropdown.Toggle variant="light" style={styles.filterButton}>
                Filter by
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setFilter('All')}>All</Dropdown.Item>
                <Dropdown.Item onClick={() => setFilter('Flood')}>Flood</Dropdown.Item>
                <Dropdown.Item onClick={() => setFilter('Fire')}>Fire</Dropdown.Item>
                <Dropdown.Item onClick={() => setFilter('Earthquake')}>Earthquake</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>

          {filteredClaims.length > 0 ? (
            filteredClaims.map((claim) => (
              <Card key={claim.id} className="mb-3" style={styles.card}>
                <Row>
                  <Col>
                    <div>
                      <strong>Claim number:</strong> {claim.claim_id}
                    </div>
                    <div>
                      <strong>Type of disaster:</strong> {claim.disaster_type}
                    </div>
                    <div>
                      <strong>Status:</strong> {formatStatus(claim.status)}
                    </div>
                    <div>
                      <strong>Date of submission:</strong> {formatDate(claim.date_submitted)}
                    </div>
                  </Col>
                  <Col className="text-end d-flex flex-column justify-content-center">
                    <Button
                      variant="link"
                      onClick={() => toggleExpand(claim.id)}
                      style={{ padding: 0, marginRight: '10px' }}
                    >
                      {expandedClaims[claim.id] ? '▲' : '▼'}
                    </Button>
                  </Col>
                </Row>
                {expandedClaims[claim.id] && (
                  <Row className="mt-3">
                    <Col>
                      {claim.images && claim.images.length > 0 ? (
                        claim.images.map((image, idx) => (
                            <div key={idx} className="mb-3">
                              <img
                                key={idx}
                                src={image.url}
                                alt={`Claim ${claim.claim_id} image ${idx + 1}`}
                                style={{
                                  ...styles.claimImage,
                                  border: image.signature_valid ? '3px solid red':'3px solid green'
                                }}
                              />
                              <Badge bg={image.signature_valid ? 'danger' : 'success'} className="ms-2">
                                {image.signature_valid ? 'Tampered' : 'Valid'}
                              </Badge>
                            </div>
                        ))
                      ) : (
                        <p>No images submitted for this claim.</p>
                      )}
                    </Col>
                  </Row>
                )}
              </Card>
            ))
          ) : (
            <p>No claims found.</p>
          )}
        </Col>
      </Row>
    </Container>
  );
};

const styles = {
  returnButton: {
    backgroundColor: '#212529',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    color: '#fff',
  },
  card: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },
  button: {
    backgroundColor: '#3E7046',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    width: '140px',
    marginTop: '8px',
    textAlign: 'center',
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #ddd',
    color: '#212529',
    padding: '6px 12px',
    borderRadius: '4px',
  },
  claimImage: {
    maxWidth: '300px',
    height: 'auto',
    marginBottom: '10px',
    marginRight: '10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
  },
};

export default ClaimHistoryPage;
