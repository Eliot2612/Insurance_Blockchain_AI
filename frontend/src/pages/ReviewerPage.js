import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const ReviewerPage = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const role = localStorage.getItem('role');

        if (role !== 'REVIEWER' && role !== 'ADMIN') {
           navigate('/access-denied');
           return;
         }

        if (!token) {
          console.error('No token found');
          return;
        }
        const response = await fetch('http://127.0.0.1:8000/api/claims/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setClaims(data);
        } else {
          console.error('Error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching claims:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, [navigate]);

  const handleReviewSubmit = async (claimId, intensity) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No token found');
        return;
      }
      const response = await fetch(`http://127.0.0.1:8000/api/claims/${claimId}/review/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ intensity })
      });
      if (response.ok) {
        alert('Review submitted successfully');
      } else {
        alert('Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col md={3}>
          <Sidebar />
        </Col>
        <Col md={9} className="py-4">
          <h4 className="mb-4">Reviewer Dashboard </h4>
          {loading ? (
            <p>Loading...</p>
          ) : claims.length > 0 ? (
            claims.map((claim) => (
              <Card key={claim.id} className="mb-3" style={styles.card}>
                <Card.Body>
                  <p><strong>Claim ID:\</strong> {claim.claim_id}</p>
                  <p><strong>Type of Disaster:\</strong> {claim.disaster_type}</p>
                  <p><strong>Status:\</strong> {claim.status}</p>
                  <p><strong>Date of Submission:\</strong> {new Date(claim.date_submitted).toLocaleString()}</p>
                  {claim.images && claim.images.length > 0 ? (
                    <div style={styles.imageGrid}>
                      {claim.images.map((img, index) => (
                        <Image
                          key={index}
                          src={img.url}
                          alt={`Claim \${claim.claim_id}`}
                          style={styles.claimImage}
                          thumbnail
                        />
                      ))}
                    </div>
                  ) : (
                    <p>No images uploaded.</p>
                  )}
                  <Form>
                    <Form.Check
                      type="radio"
                      label="Little or None"
                      name={`intensity-\${claim.id}`}
                      onChange={() => handleReviewSubmit(claim.id, 'LITTLE_OR_NONE')}
                    />
                    <Form.Check
                      type="radio"
                      label="Mild"
                      name={`intensity-\${claim.id}`}
                      onChange={() => handleReviewSubmit(claim.id, 'MILD')}
                    />
                    <Form.Check
                      type="radio"
                      label="Severe"
                      name={`intensity-\${claim.id}`}
                      onChange={() => handleReviewSubmit(claim.id, 'SEVERE')}
                    />
                  </Form>
                </Card.Body>
              </Card>
            ))
          ) : (
            <p>No claims available for review.</p>
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
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '10px',
    marginTop: '10px'
  },
  claimImage: {
    width: '100%',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '4px'
  }
};

export default ReviewerPage;