import React from 'react';
import PatientList from './components/PatientList';
import PatientOverview from './components/PatientOverview';

function DoctorDashboard() {
  return (
    <div className="doctor-dashboard">
      <h1>Doctor Dashboard</h1>
      <PatientList />
      <PatientOverview />
    </div>
  );
}

export default DoctorDashboard;