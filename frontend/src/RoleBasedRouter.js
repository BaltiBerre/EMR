//RoleBasedRouter.js
import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DoctorDashboard from './DoctorDashboard';
import PatientDashboard from './PatientDashboard';
import AdminDashboard from './AdminDashboard';

// defines a component that takes 4 props, then routes according to that
const RoleBasedRouter = ({ isAuthenticated, userRole, setIsAuthenticated, setUserRole }) => {
  return (
    <Routes>
      <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />} /> 
      <Route
        path="/doctor/*"
        element={
          <PrivateRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            requiredRole="doctor"
          >
            <DoctorDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/patient/*"
        element={
          <PrivateRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            requiredRole="patient"
          >
            <PatientDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <PrivateRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            requiredRole="admin"
          >
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};


const PrivateRoute = ({ children, isAuthenticated, userRole, requiredRole }) => {
  console.log('PrivateRoute check:', {
    isAuthenticated,
    userRole,
    requiredRole,
    roleMatch: userRole?.toLowerCase() === requiredRole?.toLowerCase()
  });

  const normalizeRole = (role) => {
    return typeof role === 'string' ? role.toLowerCase() : '';
  };

  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (normalizeRole(userRole) !== normalizeRole(requiredRole)) {
    console.log('Role mismatch:', {
      userRole: normalizeRole(userRole),
      requiredRole: normalizeRole(requiredRole)
    });
    return <Navigate to="/login" replace />;
  }

  return children;
};



export default RoleBasedRouter;