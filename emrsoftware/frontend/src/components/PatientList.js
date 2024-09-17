import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '';  // Empty string, as we're using proxy

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token:', token); // Add this line
        const response = await axios.get(`${API_URL}/api/patients`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Patient data:', response.data); 
        setPatients(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching patients:', err);
        if (err.response) {
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
          console.error('Response headers:', err.response.headers);
        } else if (err.request) {
          console.error('Request:', err.request);
        } else {
          console.error('Error message:', err.message);
        }
        setError('Failed to fetch patients. Please try again later.');
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  if (loading) return <div>Loading...</div>;
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
}

export default PatientList;