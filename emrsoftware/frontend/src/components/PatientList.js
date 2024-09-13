import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000'; // Update this if your backend URL is different

axios.defaults.withCredentials = true; // This ensures cookies are sent with requests

const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/patients`);
        setPatients(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch patients');
        setLoading(false);
        console.error('Error fetching patients:', err);
      }
    };

    fetchPatients();
  }, []);

  if (loading) return <div>Loading patients...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="patient-list">
      <h2>Patient List</h2>
      {patients.length === 0 ? (
        <p>No patients found.</p>
      ) : (
        <ul>
          {patients.map(patient => (
            <li key={patient.PatientID}>
              {patient.FirstName} {patient.LastName} - DOB: {patient.DOB}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PatientList;