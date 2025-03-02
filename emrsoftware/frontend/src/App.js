//App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom';
import RoleBasedRouter from './RoleBasedRouter';


function App() {
  //Declares backendStatus, isAuthenticated, userRole and inputs value
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setisLoggedIn] = useState(false);
  // main reason we're using useEffect is bc we want this to run once at the beginning of the application
  // and the [] makes it so that it only runs once when the component is loaded.
  useEffect(() => {
    checkBackendStatus();
    checkAuthStatus();
  }, []);

  const checkBackendStatus = async () => {
    //async means response might take a while
    try {
      // axios.get returns response object containing multiple pieces of info
      // await is paired with async, lets code know to wait for arrival of response object to use response
      const response = await axios.get('/api/health');
      // sets backendstatus to the message in the health route check
      setBackendStatus(response.data.message);
    } catch (error) {
      // sets backendstatus to offline if no response is received
      setBackendStatus('Offline');
      console.error('Backend status check failed:', error);
    }
  };

  const checkAuthStatus = () => {
    // Retrieve authentication token from localStorage
    const token = localStorage.getItem('token');
    
    // Retrieve user role from localStorage
    const role = localStorage.getItem('userRole');
    
    // Log authentication check details for debugging
    console.log('Auth check:', { hasToken: !!token, role });
  
    // If both token and role exist, set authentication status and normalize role to lowercase
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role.toLowerCase());
      setisLoggedIn(true);
    } else {
      // If either token or role is missing, reset authentication status
      setIsAuthenticated(false);
      setUserRole(null);
    }
  };
  
  
    // logout logic
  const handleLogout = () => {
    // removes from localStorage token and role
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setUserRole(null);
    setisLoggedIn(false);
  };

  return (
    <Router>
    <div className="min-h-screen bg-gray-50 flex flex-col test-bg">
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {isAuthenticated && (
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">EMR Software</h1>
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