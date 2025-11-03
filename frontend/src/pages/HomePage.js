import React, { useRef } from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ImageDropdown from '../components/ImageDropdown.js';

const HomePage = () => {
  // Create a ref to target the "Our Policies" section
  const policiesRef = useRef(null);

  const scrollToPolicies = () => {
    policiesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      {/* Hero Section */}
      <Container fluid className="bg-light py-5">
        <Row className="align-items-center">
          <Col md={7}>
            <img
              src="/images/umbrella.png"
              alt="Weather Protection"
              className="img-fluid"
              style={{
                width: '100%',
                height: '400px',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
            />
          </Col>
          <Col md={5}>
            <h1 className="fw-bold" style={{ color: '#3E7046' }}>
              AI-Powered Weather Insurance: Fast, Fair & Transparent Claims
            </h1>
            <p>
              Protect your home with smart AI-powered natural disaster insurance.
              Extreme weather events are unpredictable, but your insurance coverage shouldn’t be.
              Our <strong>AI-powered, blockchain-backed weather insurance</strong> ensures that claims
              are processed <strong>fairly, quickly, and securely</strong> —
              <span className="fw-bold"> no paperwork, no long waits, and no unfair rejections.</span>
            </p>

            <div>
              <Button variant="dark" className="me-2" as={Link} to="/register">Join us today</Button>
              {/* Scroll to Policies Button */}
              <Button variant="outline-dark" onClick={scrollToPolicies}>
                View our policies
              </Button>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Risk Types */}
      <Container className="py-3 text-center">
        <p className="text-muted">
          We insure against <span className="text-success">tsunamis</span>,
          <span className="text-success"> hurricanes</span>,
          <span className="text-success"> earthquakes</span>,
          <span className="text-success"> tornadoes</span>,
          <span className="text-success"> wildfires</span>,
          <span className="text-success"> volcanic eruptions</span>,
          <span className="text-success"> blizzards</span>,
          <span className="text-success"> hailstorms</span>,
          <span className="text-success"> mudslides</span>, and
          <span className="text-success"> floods</span>.
        </p>
      </Container>

      {/* Claims Process */}
      <Container className="py-5">
        <h2 className="text-center mb-4">
          Start protecting your home today —
          <span className="fw-bold"> A seamless process for fast, fair, and secure claims.</span>
        </h2>
        <Row>
          {[
            {
              title: 'Buy a Policy',
              text: 'Choose an insurance policy that fits your needs. Sign up and secure your coverage instantly—no long forms, no waiting.',
            },
            {
              title: 'File a Claim',
              text: 'If your property is damaged, simply upload photos and fill in a short claim form. Our AI system automatically verifies the damage by checking weather data and user-submitted images.',
            },
            {
              title: 'Verification',
              text: 'Our AI analyzes images to assess damage accurately. Claims flagged for review are checked by a human reviewer to ensure fairness.',
            },
            {
              title: 'Get Paid Instantly',
              text: 'Once approved, your insurance payout is processed immediately through blockchain smart contracts. The funds are sent directly to your bank account or digital wallet.',
            }
          ].map((step, index) => (
            <Col md={3} key={index} className="mb-4">
              <Card className="h-100 text-center">
                <Card.Body>
                  <div style={styles.stepNumber}>{index + 1}</div>
                  <Card.Title>
                    <strong>{step.title}</strong>
                  </Card.Title>
                  <Card.Text>{step.text}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Why Choose Us */}
      <Container fluid className="py-5 bg-secondary text-white">
        <h2 className="text-center mb-4">So why choose us?</h2>
        <p className="text-center">
          We believe insurance should be easy, transparent, and fast. Here’s how we make that happen:
        </p>
        <Row className="justify-content-center">
          {[
            {
              title: '100% Transparent & Secure',
              text: 'We use tamper-proof technology to store every claim, so nothing can be changed or lost.'
            },
            {
              title: 'Fast & Fair AI Decisions',
              text: 'No waiting weeks for approvals—our AI quickly checks damage using real weather data.'
            },
            {
              title: 'No Paperwork, No Delays',
              text: 'Skip the complicated forms. Submit a claim in minutes and get paid fast.'
            },
            {
              title: 'Community-Verified Fairness',
              text: 'People just like you can upload photos to confirm real disasters, making claims more reliable.'
            }
          ].map((feature, index) => (
            <Col md={3} key={index} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>
                    <strong>{feature.title}</strong>
                  </Card.Title>
                  <Card.Text>{feature.text}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Our Policies Section */}
      <Container className="py-5" ref={policiesRef}>
        {/* 👆 Added ref here */}
        <Card>
          <Card.Body>
            <h3 className="text-center">Our Policies</h3>
          </Card.Body>
        </Card>
      </Container>

      {/* Footer */}
      <footer className="bg-dark text-white py-4">
        <Container>
          <Row>
            <Col>
              <p>© 2025 EverSafeInsurance. All Rights Reserved.</p>
              <p>
                Email: support@eversafeinsure.com | Phone: 07763 696035
              </p>
              <p>Live Chat: Available 24/7</p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

const styles = {
  stepNumber: {
    backgroundColor: '#6c757d',
    color: '#fff',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '18px',
    marginBottom: '12px'
  }
};

export default HomePage;
