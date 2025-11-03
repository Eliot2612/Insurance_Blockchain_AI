import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const NewClaimPage = () => {
  const navigate = useNavigate();

  const [disasterType, setDisasterType] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('disaster_type', disasterType);
    formData.append('description', description);
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://127.0.0.1:8000/api/claims/new/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        console.error('Failed to submit claim');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Container className="py-4">
      <Button
        variant="dark"
        onClick={() => navigate('/dashboard')}
        className="mb-3"
      >
        Return to dash
      </Button>
      <Card style={styles.card}>
        <Form onSubmit={handleSubmit}>
          <h4>New Claim</h4>
          <Row>
            {/* Disaster Type */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Disaster Type</Form.Label>
                <Form.Control
                  as="select"
                  value={disasterType}
                  onChange={(e) => setDisasterType(e.target.value)}
                  required
                >
                  <option value="">Select type</option>
                  <option value="Flood">Flood</option>
                  <option value="Fire">Fire</option>
                  <option value="Earthquake">Earthquake</option>
                  <option value="Storm">Storm</option>
                  <option value="Other">Other</option>
                </Form.Control>
              </Form.Group>
            </Col>

            {/* Description */}
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>

            {/* File Upload */}
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Upload images of damage</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => setFiles([...e.target.files])}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Submit Button */}
          <Button variant="success" type="submit" style={styles.button}>
            Upload claim
          </Button>
        </Form>
      </Card>
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
    padding: '8px 20px',
    width: '160px',
    marginTop: '10px'
  }
};

export default NewClaimPage;
