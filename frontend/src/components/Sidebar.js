import React, { useContext } from 'react';
        import { Button, ListGroup, Image } from 'react-bootstrap';
        import { useNavigate } from 'react-router-dom';
        import UserContext from '../context/UserContext';

        const Sidebar = () => {
          const navigate = useNavigate();
          const context = useContext(UserContext);

          if (!context || !context.user) {
            return <div> </div>;
          }

          const { user } = context;

          const handleLogout = () => {
            localStorage.removeItem('authToken');
            navigate('/login');
          };

          return (
            <div style={{ width: '250px', padding: '20px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              <div className="text-center mb-3">
                <Image
                  src="/images/user-icon.png"
                  roundedCircle
                  style={{ width: '100px', height: '100px' }}
                />
              </div>
              <ListGroup variant="flush">
                <ListGroup.Item className="text-center">{user.name || 'N/A'}</ListGroup.Item>
                <ListGroup.Item className="text-center">{user.email || 'N/A'}</ListGroup.Item>
              </ListGroup>
              <div className="mt-4">
                <Button
                  variant="success"
                  className="w-100 mb-2"
                  onClick={() => navigate('/edit-details')}
                >
                  Personal Details
                </Button>
                <Button
                  variant="outline-danger"
                  className="w-100"
                  onClick={handleLogout}
                >
                  Log Out
                </Button>
              </div>
            </div>
          );
        };

        export default Sidebar;