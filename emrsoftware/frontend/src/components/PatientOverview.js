//PatientOverview.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = ''; // Empty string, as we're using proxy

function PatientOverview() {
  // initialises an object with multiple properties
  const [overview, setOverview] = useState({
    totalPatients: 0,
    recentAppointments: [],
    patientDemographics: [],
    appointmentsTrend: [],
    ageDistribution: []
  });
  // initialises loading to true, error to null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calls the sideeffect function fetchOverview()
  useEffect(() => {
    fetchOverview();
  }, []);


  
  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/patient-overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOverview(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching patient overview:', err);
      setError('Failed to fetch patient overview. Please try again later.');
      setLoading(false);
    }
  };

  return <div> Work in progress </div>;
}

export default PatientOverview;