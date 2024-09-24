//App.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PatientList from './components/PatientList';
import Login from './components/Login';
import './emr-styles.css';  // Import the new CSS file

const API_URL = '';  // Empty string, as we're using proxy

axios.defaults.withCredentials = true;

function App() {
  const [backendStatus, setBackendStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsLoggedIn(true);
    }

    axios.get(`${API_URL}/api/health`)
      .then(response => setBackendStatus(response.data.message))
      .catch(error => {
        console.error('Error:', error);
        setBackendStatus('Unavailable');
      });
  }, []);

  const handleLogin = (role) => {
    setIsLoggedIn(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setIsLoggedIn(false);
    setUserRole(null);
  };

  return (
    <div className="container">
      <h1>EMR Software</h1>
      <div className="status-info">
        <p>Backend status: {backendStatus}</p>
        {isLoggedIn && <p>Logged in as: {userRole}</p>}
      </div>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
          <PatientList />
        </>
      )}
    </div>
  );
}

export default App;