import { createContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch('http://127.0.0.1:8000/api/me/', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.detail) {
            setUser({
              ...data,
              joinDate: data.join_date || 'N/A',
            });
            console.log('User loaded:', data);
          }
        })
        .catch((err) => console.error('Failed to load user:', err));
    }
  }, []);

  console.log('User state:', user);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
