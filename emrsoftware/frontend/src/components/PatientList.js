import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus } from 'lucide-react';

const API_URL = '';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [searchQuery, setSearchQuery] = useState('');
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
      console.log('Token:', token); // Debug token
  
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }
  
      // Ensure API_URL is correct
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      console.log('API URL:', API_URL); // Debug URL
  
      const response = await axios.get(`${API_URL}/api/patients`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setPatients(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError('Failed to fetch patients. Please try again later.');
      setLoading(false);
    }
  };

  const handlePatientSelection = (patientId) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
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

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error) return <div className="text-center py-4 text-red-600">Error: {error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold">Patient Management</h2>
      </div>
      <div className="p-6">
        {/* Patient Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              name="FirstName"
              value={newPatient.FirstName}
              onChange={handleInputChange}
              placeholder="First Name"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <input
              name="LastName"
              value={newPatient.LastName}
              onChange={handleInputChange}
              placeholder="Last Name"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <input
              name="DOB"
              type="date"
              value={newPatient.DOB}
              onChange={handleInputChange}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <select
              name="Gender"
              value={newPatient.Gender}
              onChange={handleInputChange}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input
              name="Address"
              value={newPatient.Address}
              onChange={handleInputChange}
              placeholder="Address"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              name="PhoneNumber"
              value={newPatient.PhoneNumber}
              onChange={handleInputChange}
              placeholder="Phone Number"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <input
              name="Email"
              type="email"
              value={newPatient.Email}
              onChange={handleInputChange}
              placeholder="Email"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </button>
          </div>
        </form>

        {/* View Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full md:w-64 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600'}`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600'}`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.length > 0 ? (
                patients.map(patient => (
                  <tr key={patient.patientid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPatients.includes(patient.patientid)}
                        onChange={() => handlePatientSelection(patient.patientid)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{patient.firstname}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{patient.lastname}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{patient.dob}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{patient.gender}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{patient.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{patient.phonenumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{patient.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleDelete(patient.patientid)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    No patients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PatientList;