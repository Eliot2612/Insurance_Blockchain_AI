import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import CustomNavbar from './components/NavBar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EditDetails from './pages/EditDetails';
import { UserProvider } from './context/UserContext';
import NewClaimPage from './pages/NewClaimPage';
import ClaimHistoryPage from './pages/ClaimHistoryPage';
import ReviewerPage from "./pages/ReviewerPage";
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <UserProvider>
    <Router>
      <CustomNavbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/edit-details" element={<EditDetails />} />
        <Route path="/new-claim" element={<NewClaimPage />} />
        <Route path="/claims-history" element={<ClaimHistoryPage />} />
        <Route path="/reviewer" element={<ReviewerPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
    </UserProvider>
  );
}
export default App;
