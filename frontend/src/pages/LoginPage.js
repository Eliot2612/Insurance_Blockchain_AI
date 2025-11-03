import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { hashPassword } from "../components/Hash"

function LoginPage() {
  const navigate = useNavigate();

  // State for login fields and error handling
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Handle form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const hashedPassword = await hashPassword(password.trim());

    // Payload to send to Django backend
    const loginData = {
      email: email.trim(),
      password: hashedPassword,
    };

    fetch('http://127.0.0.1:8000/api/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    })
      .then(async (res) => {
        const jsonData = await res.json();
        if (!res.ok) {
          throw new Error(jsonData.detail || 'Login failed');
        }
        return jsonData;
      })
      .then((data) => {
        console.log('User logged in successfully:', data);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('role', data.role);

        // Redirect based on the 'redirect_url' provided by the backend
        const redirectUrl = data.redirect_url || '/dashboard'; // Default to '/dashboard'
        navigate(redirectUrl); // Navigate to the correct page
      })
      .catch((err) => {
        console.error('Login error:', err);
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
        <h2 className="text-center mb-1">Log in to your account</h2>
        <p className="text-center text-muted">Welcome back!</p>

        {/* Error Message */}
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Login Form */}
        <Form onSubmit={handleLogin}>
          {/* Email Field */}
          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          {/* Password Field */}
          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          {/* Submit Button */}
          <Button variant="primary" type="submit" className="w-100 mb-3">
            Log in
          </Button>
        </Form>

        {/* Signup Link */}
        <div className="text-center">
          <span>Don't have an account? </span>
          <a href="/register" className="text-primary" style={{ textDecoration: 'none' }}>
            Sign up
          </a>
        </div>
      </Card>
    </Container>
  );
}

export default LoginPage;
