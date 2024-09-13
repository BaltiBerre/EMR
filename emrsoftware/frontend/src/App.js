import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PatientList from './components/PatientList';

const API_URL = 'http://localhost:3000';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/api/login`, { Username: username, Password: password });
      onLogin(response.data.role);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}

function App() {
  const [backendStatus, setBackendStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
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

  return (
    <div className="App">
      <h1>EMR Software</h1>
      <p>Backend status: {backendStatus}</p>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <p>Logged in as: {userRole}</p>
          <PatientList />
        </>
      )}
    </div>
  );
}

export default App;