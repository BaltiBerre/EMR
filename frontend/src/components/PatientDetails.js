// src/components/PatientDetails.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, Calendar, FilePlus, Edit, Trash, Save, X } from 'lucide-react';

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
    visitdate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });
  
  const isDoctor = userRole === 'doctor';
  
  useEffect(() => {
    console.log('PatientDetails component mounted with patient ID:', patient.patientid);
    console.log('User role:', userRole);
    fetchMedicalRecords();
    
    // Add cleanup function
    return () => {
      console.log('PatientDetails component unmounting');
    };
  }, [patient.patientid]);
  
  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      console.log(`Attempting to fetch medical records for patient ID: ${patient.patientid}`);
      const response = await axios.get(`${API_URL}/api/medical-records/patient/${patient.patientid}`, {
        withCredentials: true
      });
      console.log('Medical records fetched successfully:', response.data);
      setMedicalRecords(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching medical records:', err);
      console.error('Error details:', err.response?.data || err.message);
      console.error('Request URL:', `${API_URL}/api/medical-records/patient/${patient.patientid}`);
      setError('Failed to load medical records.');
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    setNewRecord({ ...newRecord, [e.target.name]: e.target.value });
  };
  
  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting to add new medical record:', {
        PatientID: patient.patientid,
        VisitDate: newRecord.visitdate,
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      });
      
      const response = await axios.post(`${API_URL}/api/medical-records`, {
        PatientID: patient.patientid,
        VisitDate: newRecord.visitdate,
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      }, {
        withCredentials: true
      });
      
      console.log('Medical record added successfully:', response.data);
      
      // Reset form and fetch updated records
      setNewRecord({
        diagnosis: '',
        treatment: '',
        notes: '',
        visitdate: new Date().toISOString().split('T')[0]
      });
      setShowAddRecordForm(false);
      fetchMedicalRecords();
    } catch (err) {
      console.error('Error adding medical record:', err);
      console.error('Error response:', err.response?.data || err.message);
      console.error('Error status:', err.response?.status);
      console.error('Request payload:', {
        PatientID: patient.patientid,
        VisitDate: newRecord.visitdate,
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      });
      setError('Failed to add medical record. Please try again.');
    }
  };
  
  const handleEditRecord = (record) => {
    setEditingRecordId(record.recordid);
    setNewRecord({
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      notes: record.notes || '',
      visitdate: new Date(record.visitdate).toISOString().split('T')[0]
    });
  };
  
  const handleUpdateRecord = async (recordId) => {
    try {
      console.log(`Attempting to update medical record ID: ${recordId}`, {
        PatientID: patient.patientid,
        VisitDate: newRecord.visitdate,
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      });
      
      const response = await axios.put(`${API_URL}/api/medical-records/${recordId}`, {
        PatientID: patient.patientid,
        VisitDate: newRecord.visitdate,
        Diagnosis: newRecord.diagnosis,
        Treatment: newRecord.treatment,
        Notes: newRecord.notes
      }, {
        withCredentials: true
      });
      
      console.log('Medical record updated successfully:', response.data);
      
      setEditingRecordId(null);
      fetchMedicalRecords();
    } catch (err) {
      console.error(`Error updating medical record ID: ${recordId}`, err);
      console.error('Error response:', err.response?.data || err.message);
      console.error('Error status:', err.response?.status);
      setError('Failed to update medical record. Please try again.');
    }
  };
  
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this medical record? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log(`Attempting to delete medical record ID: ${recordId}`);
      
      const response = await axios.delete(`${API_URL}/api/medical-records/${recordId}`, {
        withCredentials: true
      });
      
      console.log('Medical record deleted successfully:', response.data);
      
      fetchMedicalRecords();
    } catch (err) {
      console.error(`Error deleting medical record ID: ${recordId}`, err);
      console.error('Error response:', err.response?.data || err.message);
      console.error('Error status:', err.response?.status);
      setError('Failed to delete medical record. Please try again.');
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
              </div>
            </div>
          </div>
        </div>
        
        {/* Medical Records Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Medical Records</h3>
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
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Diagnosis
                        </label>
                        <input
                          type="text"
                          name="diagnosis"
                          value={newRecord.diagnosis}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Treatment
                        </label>
                        <input
                          type="text"
                          name="treatment"
                          value={newRecord.treatment}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        ></textarea>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 border border-gray-300 rounded-md text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateRecord(record.recordid)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
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
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.recordid)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
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
        </div>
      </div>
      
      {/* Add Medical Record Form Modal */}
      {showAddRecordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add Medical Record</h3>
              <button 
                onClick={() => setShowAddRecordForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddRecord}>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosis
                  </label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={newRecord.diagnosis}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Treatment
                  </label>
                  <input
                    type="text"
                    name="treatment"
                    value={newRecord.treatment}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddRecordForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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