import { Link } from 'react-router-dom';
import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';

function CustomNavbar() {
  return (
    <Navbar expand="lg" style={{ backgroundColor: '#35694F' }}>
      <Container>
        <Navbar.Brand href="/" className="d-flex align-items-center p-0">
          <div
            style={{
              backgroundColor: '#4F7755',
              clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)',
              padding: '0.5rem 1.8rem 0.5rem 1rem',
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            EverSafe Insurance
          </div>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0" />

        {/* Navigation Links */}
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link as={Link} to="/" className="text-white me-3">
              Home
            </Nav.Link>

            <Nav.Link as={Link} to="/login" className="text-white fw-bold">
              Log In
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default CustomNavbar;

