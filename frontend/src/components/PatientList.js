import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Trash2, Filter, UserPlus, X, Check, FileText } from 'lucide-react';
import PatientDetails from './PatientDetails'
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingPatient, setViewingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    FirstName: '',
    LastName: '',
    DOB: '',
    Gender: '',
    Address: '',
    PhoneNumber: '',
    Email: ''
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // get userRole
  const userRole = localStorage.getItem('userRole');


  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, patients]);

  const fetchPatients = async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/api/patients`, {
        withCredentials: true // This enables sending cookies with the request
      });
      setPatients(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patients. Please try again later.');
      setLoading(false);
    }
  };

  // handle viewing patients

  const handleViewDetails = (patient) => {
    setViewingPatient(patient);
  };

  // return to patient list from details view

  const handleBackToList = () => {
    setViewingPatient(null);
  }

  const handlePatientSelection = (patientId) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === filteredPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredPatients.map(p => p.patientid));
    }
  };

  const handleInputChange = (e) => {
    setNewPatient({ ...newPatient, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {

      await axios.post(`${API_URL}/api/patients`, newPatient, {
        withCredentials: true
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
      setShowAddForm(false);
      fetchPatients();
    } catch (err) {
      console.error('Error adding patient:', err);
      setError('Failed to add patient. Please try again.');
    }
  };

  const handleDelete = async (patientId) => {
    try {
      await axios.delete(`${API_URL}/api/patients/${patientId}`, {
        withCredentials: true
      });
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
      fetchPatients();
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError('Failed to delete patient. Please try again.');
    }
  };

  const handleBatchDelete = async () => {
    try {
      // Use Promise.all to delete multiple patients in parallel
      await Promise.all(
        selectedPatients.map(patientId => 
          axios.delete(`${API_URL}/api/patients/${patientId}`, {
            withCredentials: true
          })
        )
      );
      setSelectedPatients([]);
      fetchPatients();
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting patients:', err);
      setError('Failed to delete patients. Please try again.');
    }
  };

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstname} ${patient.lastname}`.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    
    return (
      fullName.includes(searchLower) ||
      (patient.email && patient.email.toLowerCase().includes(searchLower)) ||
      (patient.phonenumber && patient.phonenumber.includes(searchQuery))
    );
  });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPatients = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

  if (loading) return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2">Loading patients...</span>
    </div>
  );

    // If viewing a patient's details, render the PatientDetails component
    if (viewingPatient) {
      return <PatientDetails 
        patient={viewingPatient} 
        onBack={handleBackToList} 
        userRole={userRole}
      />;
    }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold">Patient Management</h2>
      </div>
      
      <div className="p-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex justify-between">
            <div className="flex items-center">
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="text-red-400 hover:text-red-600"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">
                {confirmDelete === 'batch' 
                  ? `Delete ${selectedPatients.length} selected patients?` 
                  : 'Delete this patient?'}
              </h3>
              <p className="text-gray-600 mb-6">
                This action cannot be undone. The patient data will be permanently removed.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete === 'batch' ? handleBatchDelete() : handleDelete(confirmDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 justify-between items-center mb-6">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex space-x-3 w-full md:w-auto justify-end">
            {selectedPatients.length > 0 && (
              <button
                onClick={() => setConfirmDelete('batch')}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Selected ({selectedPatients.length})
              </button>
            )}
            
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlus size={16} className="mr-2" />
              Add Patient
            </button>
          </div>
        </div>

        {/* Patient Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={selectedPatients.length === filteredPatients.length && filteredPatients.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demographics</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPatients.length > 0 ? (
                currentPatients.map(patient => (
                  <tr key={patient.patientid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPatients.includes(patient.patientid)}
                          onChange={() => handlePatientSelection(patient.patientid)}
                          className="rounded border-gray-300 mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{patient.firstname} {patient.lastname}</div>
                          {patient.email && (
                            <div className="text-sm text-gray-500">{patient.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {patient.phonenumber && (
                        <div className="text-sm text-gray-900">{patient.phonenumber}</div>
                      )}
                      {patient.address && (
                        <div className="text-sm text-gray-500">{patient.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(patient.dob).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">{patient.gender}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center flex items-center justify-center space-x-2">
                    {/* View Details button */}
                    <button
                      onClick={() => handleViewDetails(patient)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Patient Details"
                    >
                      <FileText size={18} />
                    </button>
                    
                    <button
                      onClick={() => setConfirmDelete(patient.patientid)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Patient"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                    {searchQuery 
                      ? 'No patients match your search criteria.' 
                      : 'No patients found. Add a new patient to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination Controls */}
           {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 px-6">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPatients.length)} of {filteredPatients.length} patients
              </div> 
              <div className="flex space-x-2 px-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>

                {/* Always show the first page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`px-3 py-1 border border-gray-300 rounded-md ${
                    currentPage === 1 ? 'bg-blue-600 text-white' : 'text-gray-700'
                  }`}
                >
                  1
                </button>

                {/* Show ellipsis if there's a gap between page 1 and the pages around currentPage */}
                {currentPage > 3 && <span className="px-3 py-1 text-gray-700">...</span>}

                {/* Show pages around the current page */}
                {Array.from(
                  { length: 3 },
                  (_, i) => currentPage - 1 + i
                )
                  .filter(page => page > 1 && page < totalPages)
                  .map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border border-gray-300 rounded-md ${
                        currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                {/* Show ellipsis if there's a gap between the pages around currentPage and the last page */}
                {currentPage < totalPages - 2 && <span className="px-3 py-1 text-gray-700">...</span>}

                {/* Always show the last page */}
                {totalPages > 1 && (
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-3 py-1 border border-gray-300 rounded-md ${
                      currentPage === totalPages ? 'bg-blue-600 text-white' : 'text-gray-700'
                    }`}
                  >
                    {totalPages}
                  </button>
                )}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

      {/* Add Patient Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add New Patient</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    name="FirstName"
                    value={newPatient.FirstName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    name="LastName"
                    value={newPatient.LastName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    name="DOB"
                    type="date"
                    value={newPatient.DOB}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    name="Gender"
                    value={newPatient.Gender}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Genderqueer">Genderqueer</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    name="PhoneNumber"
                    value={newPatient.PhoneNumber}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    name="Email"
                    type="email"
                    value={newPatient.Email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />  
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    name="Address"
                    value={newPatient.Address}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientList;