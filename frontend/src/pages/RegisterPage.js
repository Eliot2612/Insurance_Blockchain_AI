import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { hashPassword } from "../components/Hash";
import { validateInput, validateWalletAddress, handleInputChange, validateEmail} from '../components/Validation';

function RegisterPage() {
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [walletError, setWalletError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Basic checks
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const hashedPassword = await hashPassword(password.trim());

    // Payload to send to Django
    const newUserData = {
      name: name.trim(),
      email: email.trim(),
      address: address.trim(),
      wallet_address: walletAddress.trim(),
      password: hashedPassword,
    };

    fetch('http://127.0.0.1:8000/api/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserData),
    })
      .then(async (res) => {
        const jsonData = await res.json();
        if (!res.ok) {
          throw new Error(jsonData.detail || 'Registration failed');
        }
        return jsonData;
      })
      .then((data) => {
        console.log('User registered successfully:', data);
        navigate('/login'); // Redirect to login on success
      })
      .catch((err) => {
        console.error('Registration error:', err);
        setError(err.message);
      });
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Card style={{ width: '100%', maxWidth: '400px', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <img
            src="/images/eversafeLogo.png"
            alt="EverSafe Insurance"
            style={{ width: '150px' }}
          />
        </div>

        {/* Heading */}
        <h2 className="text-center mb-1">Create an account</h2>
        <p className="text-center text-muted">Start your journey!</p>

        {/* Error Message */}
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Signup Form */}
        <Form onSubmit={handleRegister}>
          {/* Name Field */}
          <Form.Group className="mb-3" controlId="formName">
            <Form.Label>Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={handleInputChange(setName, setNameError, 'Name', validateInput)}
              required
            />
            {nameError && <small className="text-danger">{nameError}</small>}
          </Form.Group>

          {/* Email Field */}
          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label>Email <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={handleInputChange(setEmail, setEmailError, 'Email', validateEmail)}
              required
            />
            {emailError && <small className="text-danger">{emailError}</small>}
          </Form.Group>

          {/* Password Field */}
          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>Password <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          {/* Confirm Password Field */}
          <Form.Group className="mb-3" controlId="formConfirmPassword">
            <Form.Label>Confirm Password <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>


          {/* Wallet Address Field */}
          <Form.Group className="mb-3" controlId="formWalletAddress">
            <Form.Label>Ethereum Wallet Address <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={walletAddress}
              onChange={handleInputChange(setWalletAddress, setWalletError, 'Wallet Address', validateWalletAddress)}
              placeholder="0x..."
            />
            {walletError && <small className="text-danger">{walletError}</small>}
          </Form.Group>

          {/* Submit Button */}
          <Button
            variant="primary"
            type="submit"
            className="w-100 mb-3"
            disabled={!!nameError || !!emailError || !!walletError || !name || !email || !password || !confirmPassword}
          >
            Get started
          </Button>
        </Form>

        {/* Login Link */}
        <div className="text-center">
          <span>Already have an account? </span>
          <a href="/login" className="text-primary" style={{ textDecoration: 'none' }}>
            Log in
          </a>
        </div>
      </Card>
    </Container>
  );
}

export default RegisterPage;
