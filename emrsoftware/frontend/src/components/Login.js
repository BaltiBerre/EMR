import React, { useState } from 'react';
import axios from 'axios';

const API_URL = '';  // Empty string, as we're using proxy

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/api/login`, { Username: username, Password: password });
      localStorage.setItem('token', response.data.token);
      onLogin(response.data.role);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <h2>Log in</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your email address may be your username."
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" className="show-password">Show</button>
        </div>
        <button type="submit" className="login-button">Log in</button>
      </form>
      <p>Don't have an account? <a href="#">Create account</a></p>
      <p>Using a public or shared computer?<br />
         Keep your information secure. Log out and close all windows when you're done.</p>
    </div>
  );
}

export default Login;