// src/components/PatientDetails.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, Calendar, FilePlus, Edit, Trash, Save, X, ChevronRight, ChevronUp } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function PatientDetails({ patient, onBack, userRole }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [showAddRecordForm, setShowAddRecordForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [newRecord, setNewRecord] = useState({
    diagnosis: '',
    treatment: '',
    notes: '',
    visitdate: new Date().toLocaleDateString('en-US') // Returns MM/DD/YYYY format
  });
  const [assignedDoctor, setAssignedDoctor] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 5; // Number of records per page
  
  const isDoctor = userRole === 'doctor';
  
  useEffect(() => {
    console.log('PatientDetails component mounted with patient ID:', patient.patientid);
    console.log('User role:', userRole);
    fetchMedicalRecords(currentPage);
    fetchAssignedDoctor();
    
    // Add cleanup function
    return () => {
      console.log('PatientDetails component unmounting');
    };
  }, [patient.patientid, currentPage]);

  
  const fetchMedicalRecords = async (page = 1) => {
    try {
      setLoading(true);
      console.log(`Attempting to fetch medical records for patient ID: ${patient.patientid}, page: ${page}`);
      
      const response = await axios.get(
        `${API_URL}/api/medical-records/patient/${patient.patientid}`, 
        {
          params: { page, limit: recordsPerPage },
          withCredentials: true
        }
      );
      
      console.log('Medical records fetched successfully:', response.data);
      
      // Update state with records and pagination info
      setMedicalRecords(response.data.records || []);
      setCurrentPage(response.data.pagination.currentPage);
      setTotalPages(response.data.pagination.totalPages);
      setTotalRecords(response.data.pagination.totalRecords);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching medical records:', err);
      console.error('Error details:', err.response?.data || err.message);
      console.error('Request URL:', `${API_URL}/api/medical-records/patient/${patient.patientid}`);
      setError('Failed to load medical records.');
      setLoading(false);
    }
  };

  const fetchAssignedDoctor = async () => {
    try {
      console.log(`Attempting to fetch assigned doctor for patient ID: ${patient.patientid}`);
      const response = await axios.get(`${API_URL}/api/patients/${patient.patientid}/doctor`, {
        withCredentials: true
      });
      console.log('Assigned doctor data:', response.data);
      setAssignedDoctor(response.data);
    } catch (err) {
      console.error('Error fetching assigned doctor:', err);
      // Not setting an error state here, as it's not critical functionality
    }
  };
  
  
  
  const handleInputChange = (e) => {
    setNewRecord({ ...newRecord, [e.target.name]: e.target.value });
  };
  
  const handleAddRecord = async (e) => {
    e.preventDefault();
    console.log('[DEBUG] Add record form submitted');
    console.log('[DEBUG] New record data:', newRecord);
    console.log('[DEBUG] Patient ID:', patient.patientid);
    
    try {
      // Parse the MM/DD/YYYY format to a Date object, then convert to YYYY-MM-DD
      const dateParts = newRecord.visitdate.split('/');
      // Handle both MM/DD/YYYY format and already converted YYYY-MM-DD format
      let formattedDate;
      if (dateParts.length === 3) {
        // If it's in MM/DD/YYYY format
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        formattedDate = `${year}-${month}-${day}`;
      } else {
        // If it's already in YYYY-MM-DD format
        formattedDate = newRecord.visitdate;
      }
      
      console.log('[DEBUG] Preparing to add medical record with data:', {
        PatientID: patient.patientid,
        VisitDate: formattedDate, // Use the converted date format
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      });
      
      const response = await axios.post(`${API_URL}/api/medical-records`, {
        PatientID: patient.patientid,
        VisitDate: formattedDate, // Use the converted date format
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      }, {
        withCredentials: true
      });
      
      console.log('[DEBUG] Medical record added successfully:', response.data);
      
      // Reset form and fetch updated records
      setNewRecord({
        diagnosis: '',
        treatment: '',
        notes: '',
        visitdate: new Date().toLocaleDateString('en-US') // Reset to MM/DD/YYYY
      });
      setShowAddRecordForm(false);
      // Go to first page to see the new record
      setCurrentPage(1);
      fetchMedicalRecords(1);
    } catch (err) {
      // Error handling remains the same
      console.error('[ERROR] Adding medical record failed:', err);
      console.error('[ERROR] Error response:', err.response?.data || 'No response data');
      console.error('[ERROR] Error status:', err.response?.status);
      console.error('[ERROR] Request payload:', {
        PatientID: patient.patientid,
        VisitDate: newRecord.visitdate,
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      });
      
      if (err.response?.status === 403) {
        setError('Permission denied. Only doctors can add medical records.');
      } else if (err.response?.status === 400) {
        setError(`Validation error: ${err.response.data.message || 'Please check form inputs'}`);
      } else {
        setError('Failed to add medical record. Please try again.');
      }
    }
  };
  
  
  
  
  const handleEditRecord = (record) => {
    setEditingRecordId(record.recordid);
    setNewRecord({
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      notes: record.notes || '',
      visitdate: new Date(record.visitdate).toLocaleDateString('en-US')
    });
  };
  

  const handleUpdateRecord = async (recordId) => {
    console.log('[DEBUG] Update record initiated for recordId:', recordId);
    console.log('[DEBUG] Updated record data:', newRecord);
    
    try {
      // Get the doctor ID for this record (assuming it's stored in the current record)
      const currentRecord = medicalRecords.find(record => record.recordid === recordId);
      const doctorId = currentRecord?.doctorid;
      
      console.log(`[DEBUG] Attempting to update medical record ID: ${recordId}`, {
        PatientID: patient.patientid,
        DoctorID: doctorId,
        VisitDate: newRecord.visitdate,
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      });
      
      const response = await axios.put(`${API_URL}/api/medical-records/${recordId}`, {
        PatientID: patient.patientid,
        DoctorID: doctorId,
        VisitDate: newRecord.visitdate,
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      }, {
        withCredentials: true
      });
      
      console.log('[DEBUG] Medical record updated successfully:', response.data);
      
      setEditingRecordId(null);
      setNewRecord({
        diagnosis: '',
        treatment: '',
        notes: '',
        visitdate: new Date().toISOString().split('T')[0]
      });
      fetchMedicalRecords(currentPage);
    } catch (err) {
      console.error(`[ERROR] Updating medical record ID: ${recordId} failed`, err);
      console.error('[ERROR] Error response:', err.response?.data || 'No response data');
      console.error('[ERROR] Error status:', err.response?.status);
      console.error('[ERROR] Request URL:', `${API_URL}/api/medical-records/${recordId}`);
      
      // Set more descriptive error message based on the error type
      if (err.response?.status === 403) {
        setError('Permission denied. You cannot update this medical record.');
      } else if (err.response?.status === 404) {
        setError('Medical record not found. It may have been deleted.');
        // Reset edit mode and refresh records
        setEditingRecordId(null);
        fetchMedicalRecords(currentPage);
      } else if (err.response?.status === 400) {
        setError(`Validation error: ${err.response.data.message || 'Please check form inputs'}`);
      } else {
        setError('Failed to update medical record. Please try again.');
      }
    }
  };
  
  
  const handleDeleteRecord = async (recordId) => {
    console.log('[DEBUG] Delete record initiated for recordId:', recordId);
    
    if (!window.confirm('Are you sure you want to delete this medical record? This action cannot be undone.')) {
      console.log('[DEBUG] Delete operation canceled by user');
      return;
    }
    
    try {
      console.log(`[DEBUG] Attempting to delete medical record ID: ${recordId}`);
      
      const response = await axios.delete(`${API_URL}/api/medical-records/${recordId}`, {
        withCredentials: true
      });
      
      console.log('[DEBUG] Medical record deleted successfully:', response.data);
      
      // Set a success message before refreshing records
      setError(null); // Clear any existing errors
      
      // Recalculate what page to show after deletion
      const remainingRecords = totalRecords - 1;
      const newTotalPages = Math.ceil(remainingRecords / recordsPerPage);
      
      // If we deleted the last record on the last page, go to previous page
      if (currentPage > newTotalPages && currentPage > 1) {
        setCurrentPage(currentPage - 1);
        fetchMedicalRecords(currentPage - 1);
      } else {
        fetchMedicalRecords(currentPage);
      }
    } catch (err) {
      console.error(`[ERROR] Deleting medical record ID: ${recordId} failed`, err);
      console.error('[ERROR] Error response:', err.response?.data || 'No response data');
      console.error('[ERROR] Error status:', err.response?.status);
      console.error('[ERROR] Request URL:', `${API_URL}/api/medical-records/${recordId}`);
      
      // Set more descriptive error message based on the error type
      if (err.response?.status === 403) {
        setError('Permission denied. You cannot delete this medical record.');
      } else if (err.response?.status === 404) {
        setError('Medical record not found. It may have been already deleted.');
        fetchMedicalRecords(currentPage); // Refresh the list to ensure UI is in sync
      } else {
        setError('Failed to delete medical record. Please try again.');
      }
    }
  };
  
  
  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setNewRecord({
      diagnosis: '',
      treatment: '',
      notes: '',
      visitdate: new Date().toISOString().split('T')[0]
    });
  };
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  // Generate array of page numbers to display
  const getPageNumbers = () => {
    // If 5 or fewer pages, show all
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Calculate range based on current page
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust if we're near the end
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - 4);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header with back button */}
      <div className="p-6 border-b border-gray-200 flex items-center">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">Patient Details</h2>
      </div>
      
      <div className="p-6">
        {/* Error message */}
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
        
        {/* Patient basic info card */}
        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold mb-2">{patient.firstname} {patient.lastname}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-medium">{new Date(patient.dob).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="font-medium">{patient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact</p>
                  <p className="font-medium">{patient.phonenumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{patient.email || 'Not provided'}</p>
                </div>
                {patient.address && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{patient.address}</p>
                  </div>
                )}
                {assignedDoctor && (
                  <div className="md:col-span-2 mt-3">
                    <p className="text-sm text-gray-600">Assigned Doctor</p>
                    <p className="font-medium">
                      Dr. {assignedDoctor.firstname} {assignedDoctor.lastname}
                      {assignedDoctor.specialty && ` (${assignedDoctor.specialty})`}
                    </p>
                  </div>
                )}
                {!assignedDoctor && (
                  <div className="md:col-span-2 mt-3">
                    <p className="text-sm text-gray-600">Assigned Doctor</p>
                    <p className="text-gray-500 italic">No doctor assigned</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Medical Records Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-xl font-semibold">Medical Records</h3>
              
              {/* Pagination Controls - Displayed on the same line as the header */}
              {totalPages > 1 && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className={`p-1 rounded ${currentPage === 1 ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    <ChevronLeft size={16} />
                    <ChevronLeft size={16} className="-ml-3" />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-1 rounded ${currentPage === 1 ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {getPageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-full ${
                        pageNum === currentPage 
                          ? 'bg-blue-600 text-white' 
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded ${currentPage === totalPages ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded ${currentPage === totalPages ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    <ChevronRight size={16} />
                    <ChevronRight size={16} className="-ml-3" />
                  </button>
                </div>
              )}
            </div>
            
            {isDoctor && (
              <button
                onClick={() => setShowAddRecordForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FilePlus size={16} className="mr-2" />
                Add Medical Record
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading medical records...</span>
            </div>
          ) : medicalRecords.length > 0 ? (
            <div className="space-y-4">
              {medicalRecords.map(record => (
                <div 
                  key={record.recordid} 
                  className="border border-gray-200 rounded-lg p-4"
                >
                  {editingRecordId === record.recordid ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Visit Date
                        </label>
                        <input
                          type="date"
                          name="visitdate"
                          value={newRecord.visitdate}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                      />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Diagnosis <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="diagnosis"
                            value={newRecord.diagnosis}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Treatment <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="treatment"
                          value={newRecord.treatment}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          value={newRecord.notes}
                          onChange={handleInputChange}
                          rows="3"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        ></textarea>
                      </div>
                      <div className="flex justify-end space-x-2">
                      <button
                          onClick={() => {
                            console.log('[DEBUG] Edit canceled for record:', record.recordid);
                            handleCancelEdit();
                            setError(null); // Clear any errors
                          }}
                          className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            console.log('[DEBUG] Save changes initiated for record:', record.recordid);
                            handleUpdateRecord(record.recordid);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Save size={16} className="mr-1" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <Calendar size={16} className="text-gray-500 mr-2" />
                            <p className="font-medium">
                              {new Date(record.visitdate).toLocaleDateString()}
                            </p>
                          </div>
                          
                          {/* Only show full details to doctors, limited info to admins */}
                          <div className="mt-3">
                            <h4 className="font-medium">Diagnosis:</h4>
                            <p className="text-gray-700">{record.diagnosis}</p>
                          </div>
                          
                          {isDoctor && (
                            <>
                              <div className="mt-2">
                                <h4 className="font-medium">Treatment:</h4>
                                <p className="text-gray-700">{record.treatment}</p>
                              </div>
                              
                              {record.notes && (
                                <div className="mt-2">
                                  <h4 className="font-medium">Notes:</h4>
                                  <p className="text-gray-700">{record.notes}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* Edit/Delete buttons - only for doctors */}
                        {isDoctor && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditRecord(record)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit record"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.recordid)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Delete record"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No medical records found for this patient.</p>
              {isDoctor && (
                <button
                  onClick={() => setShowAddRecordForm(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Add the first record
                </button>
              )}
            </div>
          )}
          
          {/* Pagination footer - for mobile or when there are many pages */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center md:hidden">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded ${currentPage === 1 ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
                >
                  <ChevronLeft size={20} />
                </button>
                
                <span className="mx-2 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded ${currentPage === totalPages ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Medical Record Form Modal */}
      {showAddRecordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add Medical Record</h3>
              <button 
                onClick={() => {
                  console.log('[DEBUG] Add record form closed');
                  setShowAddRecordForm(false);
                  setError(null); // Clear any errors when closing form
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Add form-specific error display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
                <button 
                  onClick={() => setError(null)} 
                  className="float-right text-red-400 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            <form onSubmit={handleAddRecord}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="visitdate"
                    value={newRecord.visitdate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={newRecord.diagnosis}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    placeholder="Enter primary diagnosis"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Treatment <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="treatment"
                    value={newRecord.treatment}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    placeholder="Enter prescribed treatment"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={newRecord.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional observations or instructions (optional)"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    console.log('[DEBUG] Add record form canceled');
                    setShowAddRecordForm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDetails;