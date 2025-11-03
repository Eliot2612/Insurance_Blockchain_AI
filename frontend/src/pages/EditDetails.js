  // src/pages/EditDetails.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { hashPassword } from "../components/Hash"
import {handleInputChange, validateEmail, validateInput, validateWalletAddress} from "../components/Validation";

const EditDetails = () => {
  const navigate = useNavigate();

  // -----------------------
  // Personal Details State
  // -----------------------
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [walletID, setWalletID] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [walletError, setWalletError] = useState('');
  // -----------------------
  // Property Details State
  // -----------------------
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('');
  const [houseType, setHouseType] = useState('');
  const [occupants, setOccupants] = useState('');
  const [houseValue, setHouseValue] = useState('');
  const [currency, setCurrency] = useState('£');
  const [ownershipProof, setOwnershipProof] = useState(null);
  const [insuranceProof, setInsuranceProof] = useState(null);



  // Example house types
  const houseTypes = [
    'Detached', 'Semi-detached', 'Terraced', 'Bungalow', 'Cottage', 'Townhouse',
    'Duplex', 'Apartment', 'Mansion', 'Villa', 'Mobile Home', 'Tiny House',
    'Farmhouse', 'Chalet'
  ];

  // -----------------------------------------------------------
  // Load Existing User & Property Data Once Component Mounts
  // -----------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No token found. Please log in.');
      return;
    }

    // 1) Fetch personal user data from /api/me/
    fetch('http://127.0.0.1:8000/api/me/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.detail) {
          // Populate personal fields
          setName(data.name || '');
          setEmail(data.email || '');
          setWalletID(data.wallet_address || '');
          // If your user table includes address as well, you can do setAddress(data.address || '');
        } else {
          console.error('Error fetching user:', data.detail);
        }
      })
      .catch((err) => console.error('Failed to fetch user data:', err));

    // 2) Fetch property data from /api/property/
    fetch('http://127.0.0.1:8000/api/property/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.detail) {
          // Populate property fields
          setAddress(data.address || '');
          setCity(data.city || '');
          setPostcode(data.postcode || '');
          setCountry(data.country || '');
          setHouseType(data.house_type || '');
          setOccupants(data.occupants || '');
          setHouseValue(data.house_value || '');
          setCurrency(data.currency || '£');
          // Proof files won't be displayed in <input type="file" />—you can store the URLs if needed
        } else {
          console.error('Error fetching property:', data.detail);
        }
      })
      .catch((err) => console.error('Failed to fetch property data:', err));
  }, []);

  // -----------------------------------------------------------
  // Handle Personal Details Submission
  // -----------------------------------------------------------
  const handleSavePersonalDetails = async (e) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmNewPassword) {
      alert('Passwords do not match.');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    const hashedPassword = await hashPassword(newPassword);

    // Payload for the user
    const payload = {
      name,
      email,
      wallet_address: walletID,
      new_password: hashedPassword || null
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/update-user/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update personal details');
      }

      console.log('Personal details updated');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating personal details:', error);
    }
  };

  // -----------------------------------------------------------
  // Handle Property Details Submission
  // -----------------------------------------------------------
  const handleSavePropertyDetails = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Use FormData for file uploads
    const formData = new FormData();
    formData.append('address', address);
    formData.append('city', city);
    formData.append('postcode', postcode);
    formData.append('country', country);
    formData.append('house_type', houseType);
    formData.append('occupants', occupants);
    formData.append('house_value', houseValue);
    formData.append('currency', currency);

    if (ownershipProof) formData.append('ownership_proof', ownershipProof);
    if (insuranceProof) formData.append('insurance_proof', insuranceProof);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/property/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to update property details');
      }

      console.log('Property details updated');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating property details:', error);
    }
  };

  return (
    <Container fluid>
      <Row>
        {/* Left Sidebar */}
        <Col md={3}>
          <Sidebar />
        </Col>

        {/* Main Content */}
        <Col md={8} className="py-4" style={styles.content}>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="dark"
            className="mb-4"
            style={styles.returnButton}
          >
            Return to Dashboard
          </Button>

          <Row>
            {/* PERSONAL DETAILS */}
            <Col md={6} style={styles.section}>
              <h4 style={styles.heading}>Personal Details</h4>
              <Form onSubmit={handleSavePersonalDetails}>
                {/* Name */}
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={name}
                    onChange={handleInputChange(setName, setNameError, 'Name', validateInput)}
                    required
                    style={styles.input}
                  />
                  {nameError && <small className="text-danger">{nameError}</small>}
                </Form.Group>

                {/* Email */}
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={handleInputChange(setEmail, setEmailError, 'Email', validateEmail)}
                    required
                    style={styles.input}
                  />
                  {emailError && <small className="text-danger">{emailError}</small>}
                </Form.Group>

                {/* Wallet ID */}
                <Form.Group className="mb-3">
                  <Form.Label>Wallet ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={walletID}
                    onChange={handleInputChange(setWalletID, setWalletError, 'Wallet Address', validateWalletAddress)}
                    style={styles.input}
                  />
                  {walletError && <small className="text-danger">{walletError}</small>}
                </Form.Group>

                {/* New Password */}
                <Form.Group className="mb-4">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.input}
                  />
                </Form.Group>

                {/* Confirm New Password */}
                <Form.Group className="mb-4">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    style={styles.input}
                  />
                </Form.Group>

                <Button type="submit"
                        style={styles.button}
                        disabled={!!nameError || !!emailError || !!walletError || !name || !email}
                >
                  Save Personal Changes
                </Button>
              </Form>
            </Col>

            {/* PROPERTY DETAILS */}
            <Col md={6} style={styles.section}>
              <h4 style={styles.heading}>Property Details</h4>
              <Form onSubmit={handleSavePropertyDetails} encType="multipart/form-data">
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={styles.input}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>City</Form.Label>
                  <Form.Control
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={styles.input}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Postcode</Form.Label>
                  <Form.Control
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    style={styles.input}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Country</Form.Label>
                  <Form.Control
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    style={styles.input}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>House Type</Form.Label>
                  <Form.Select
                    value={houseType}
                    onChange={(e) => setHouseType(e.target.value)}
                    style={styles.input}
                  >
                    <option value="">Select House Type</option>
                    {houseTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Occupants</Form.Label>
                  <Form.Control
                    type="number"
                    value={occupants}
                    onChange={(e) => setOccupants(e.target.value)}
                    style={styles.input}
                  />
                </Form.Group>

                {/* House Value + Currency */}
                <Form.Group className="mb-3">
                  <Form.Label>House Value</Form.Label>
                  <div className="d-flex">
                    <Form.Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="me-2"
                      style={styles.input}
                    >
                      <option value="£">£</option>
                      <option value="$">$</option>
                      <option value="€">€</option>
                    </Form.Select>
                    <Form.Control
                      type="number"
                      value={houseValue}
                      onChange={(e) => setHouseValue(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </Form.Group>

                {/* Ownership Proof */}
                <Form.Group className="mb-3">
                  <Form.Label>Ownership Proof</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => setOwnershipProof(e.target.files[0])}
                    style={styles.input}
                  />
                </Form.Group>

                {/* Insurance Proof */}
                <Form.Group className="mb-3">
                  <Form.Label>Insurance Proof</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => setInsuranceProof(e.target.files[0])}
                    style={styles.input}
                  />
                </Form.Group>

                <Button type="submit" style={styles.button}>
                  Save Property Changes
                </Button>
              </Form>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

const styles = {
  content: {
    marginLeft: '-30px',
  },
  section: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  input: {
    borderRadius: '6px',
    padding: '10px',
  },
  button: {
    backgroundColor: '#198754',
    color: '#fff',
    borderRadius: '6px',
    width: '100%',
  },
  returnButton: {
    backgroundColor: '#000',
    color: '#fff',
  },
  heading: {
    marginBottom: '1rem',
  },
};

export default EditDetails;
