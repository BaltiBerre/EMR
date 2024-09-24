import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PatientOverview from './PatientOverview';


const API_URL = '';  // Empty string, as we're using proxy

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [newPatient, setNewPatient] = useState({
    FirstName: '',
    LastName: '',
    DOB: '',
    Gender: '',
    Address: '',
    PhoneNumber: '',
    Email: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to fetch patients. Please try again later.');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const handlePatientSelection = (patientId) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Normal BP': return 'blue';
      case 'Elevated BP': return 'yellow';
      case 'High BP / Hypertensive': return 'red';
      default: return 'gray';
    }
  };


  const handleInputChange = (e) => {
    setNewPatient({ ...newPatient, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/patients`, newPatient, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewPatient({
        FirstName: '',
        LastName: '',
        DOB: '',
        Gender: '',
        Address: '',
        PhoneNumber: '',
        Email: ''
      });
      fetchPatients();
    } catch (err) {
      console.error('Error adding patient:', err);
      setError('Failed to add patient. Please try again.');
    }
  };

  const handleDelete = async (patientId) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/patients/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchPatients();
      } catch (err) {
        console.error('Error deleting patient:', err);
        setError('Failed to delete patient. Please try again.');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="patients-manager">
      <div className="patients-header">
        <h2>PATIENTS MANAGER</h2>
        <button className="invite-button">Button that will be used for something +</button>
      </div>
         <div className="nav-buttons">
      <button
        className={`nav-button ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        Patients overview
      </button>
      <button
        className={`nav-button ${activeTab === 'list' ? 'active' : ''}`}
        onClick={() => setActiveTab('list')}
      >
        Patients list
      </button>
    </div>
      {activeTab === 'overview' && <PatientOverview />}
      {activeTab === 'list' && (
        <>
          <form onSubmit={handleSubmit}>
            <input name="FirstName" value={newPatient.FirstName} onChange={handleInputChange} placeholder="First Name" required />
            <input name="LastName" value={newPatient.LastName} onChange={handleInputChange} placeholder="Last Name" required />
            <input name="DOB" type="date" value={newPatient.DOB} onChange={handleInputChange} required />
            <select name="Gender" value={newPatient.Gender} onChange={handleInputChange} required>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input name="Address" value={newPatient.Address} onChange={handleInputChange} placeholder="Address" />
            <input name="PhoneNumber" value={newPatient.PhoneNumber} onChange={handleInputChange} placeholder="Phone Number" required />
            <input name="Email" type="email" value={newPatient.Email} onChange={handleInputChange} placeholder="Email" required />
            <button type="submit">Add Patient</button>
          </form>
          <div className="list-controls">
            <div className="view-buttons">
              <button>List view</button>
              <button>Grid view</button>
              <button>Table view</button>
              <span>Selected {selectedPatients.length}</span>
              <select>
                <option>Choose action</option>
              </select>
            </div>
            <div className="search-bar">
              <input type="text" placeholder="Search" />
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>Address</th>
                <th>Phone Number</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length > 0 ? (
                patients.map(patient => (
                  <tr key={patient.patientid}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedPatients.includes(patient.patientid)}
                        onChange={() => handlePatientSelection(patient.patientid)}
                      />
                    </td>
                    <td>{patient.firstname}</td>
                    <td>{patient.lastname}</td>
                    <td>{formatDate(patient.dob)}</td>
                    <td>{patient.gender}</td>
                    <td>{patient.address}</td>
                    <td>{patient.phonenumber}</td>
                    <td>{patient.email}</td>
                    <td>
                      <button onClick={() => handleDelete(patient.patientid)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9">No patients found</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default PatientList;