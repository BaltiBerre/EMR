// Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserCircle, Lock } from 'lucide-react';
import RegisterForm from './RegisterForm';

const API_URL = process.env.REACT_APP_API_URL || '';

function Login({ setIsAuthenticated, setUserRole }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [isLoginView, setIsLoginView] = useState(true);

  const toggleForm = () => setIsLoginView(!isLoginView);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        Username: username,
        Password: password
      }, {
        withCredentials: true
      });
  
      const userRole = response.data.role.toLowerCase();
      localStorage.setItem('userRole', userRole);
      setIsAuthenticated(true);
      setUserRole(userRole);
  
      const roleRoutes = {
        doctor: '/doctor',
        patient: '/patient',
        admin: '/admin'
      };
  
      const route = roleRoutes[userRole];
      if (route) {
        navigate(route);
      } else {
        setError('Unknown user role');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 
        'Login failed. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-6xl w-full mx-auto grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Welcome Text */}
        <div className="hidden md:block space-y-6">
          <h1 className="text-4xl font-bold text-gray-900">
            Healthcare Management System
          </h1>
          <p className="text-xl text-gray-600">
            Access your dashboard to manage patients, appointments, and medical records securely.
          </p>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">System Features:</h3>
            <ul className="space-y-3">
              <li className="flex items-center text-gray-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Patient Records Management
              </li>
              <li className="flex items-center text-gray-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Appointment Scheduling
              </li>
              <li className="flex items-center text-gray-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Medical History Tracking
              </li>
              <li className="flex items-center text-gray-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Secure Data Management
              </li>
            </ul>
          </div>
        </div>

        {/* Right side - Login/Register Form */}
        <div className="w-full max-w-md mx-auto">
          {isLoginView ? (
            <div className="bg-white shadow-xl rounded-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                <p className="text-gray-600 mt-2">Please sign in to your account</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label 
                      htmlFor="username" 
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Username
                    </label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label 
                      htmlFor="password" 
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Sign in
                </button>

                <div className="text-center pt-4">
                  <p className="text-gray-600">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={toggleForm}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Register now
                    </button>
                  </p>
                </div>
              </form>
            </div>
          ) : (
            <RegisterForm onToggleForm={toggleForm} setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;