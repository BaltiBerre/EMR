//App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom';
import RoleBasedRouter from './RoleBasedRouter';


function App() {
  //Declares backendStatus, isAuthenticated, userRole and inputs value
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [backendStatus, setBackendStatus] = useState(false);
  // main reason we're using useEffect is bc we want this to run once at the beginning of the application
  // and the [] makes it so that it only runs once when the component is loaded.
  useEffect(() => {
    const checkBackendStatus = async () => {
      const lastCheck = localStorage.getItem('lastHealthCheck');
      const now = Date.now();
      if (lastCheck && now - parseInt(lastCheck) < 300000) {
        return;
      }
      
      try {
        const response = await axios.get(`${API_URL}/api/health`);
        setBackendStatus(response.data.message);
        localStorage.setItem('lastHealthCheck', now.toString());
      } catch (error) {
        setBackendStatus('Offline');
        console.error('Backend status check failed:', error);
      }
    };
  
    checkBackendStatus();
    checkAuthStatus();
  }, []);

  const API_URL = process.env.REACT_APP_API_URL || '';

 

  const checkAuthStatus = () => {
    // Retrieve user role from localStorage
    const role = localStorage.getItem('userRole');
    
    // Log authentication check details for debugging
    console.log('Auth check:', { role });
  
    // If role exists, set authentication status and normalize role to lowercase
    if (role) {
      setIsAuthenticated(true);
      setUserRole(role.toLowerCase());
    } else {
      // If role is missing, reset authentication status
      setIsAuthenticated(false);
      setUserRole(null);
    }
  };
  
  
    // logout logic
    const handleLogout = async () => {
      try {
        await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
      } catch (error) {
        console.error('Logout error:', error);
      }
      
      localStorage.removeItem('userRole');
      localStorage.removeItem('userInfo');
      setIsAuthenticated(false);
      setUserRole(null);
    };
    

  return (
    <Router>
    <div className="min-h-screen bg-gray-50 flex flex-col test-bg">
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {isAuthenticated && (
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-end items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>
        )}
        
        <main className="flex-1">
          <RoleBasedRouter 
            isAuthenticated={isAuthenticated} 
            userRole={userRole}
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
          />
        </main>
      </div>
      </div>
    </Router>
  );
}

export default App;