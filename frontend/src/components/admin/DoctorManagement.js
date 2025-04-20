// EMR/frontend/src/components/admin/DoctorManagement.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, MinusCircle, UserPlus, Users, ChevronLeft } from 'lucide-react';
import AssignedPatientsList from './AssignedPatientsList';

function DoctorManagement() {
  // Combined state from both components
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showPatientAssignmentModal, setShowPatientAssignmentModal] = useState(false);
  const [allPatients, setAllPatients] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  
  // New doctor form state
  const [newDoctor, setNewDoctor] = useState({
    username: '',
    password: '',
    firstname: '',
    lastname: '',
    specialization: '',
    email: '',
    phonenumber: ''
  });
  
  const API_URL = process.env.REACT_APP_API_URL || '';

  // Initial data fetch
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchAllPatients = async () => {
    try {
      setPatientsLoading(true);
      
      // If a doctor is selected, get only unassigned patients
      if (selectedDoctor && selectedDoctor.doctorInfo) {
        const doctorId = selectedDoctor.doctorInfo.doctorid;
        if (!doctorId) {
          console.error('Doctor ID is undefined in fetchAllPatients');
          setError('Doctor ID not found');
          setPatientsLoading(false);
          return;
        }
        
        const response = await axios.get(
          `${API_URL}/api/doctors/${doctorId}/unassigned-patients`, 
          { withCredentials: true }
        );
        setAllPatients(response.data);
      } else {
        // Otherwise get all patients
        const response = await axios.get(`${API_URL}/api/patients`, {
          withCredentials: true
        });
        setAllPatients(response.data);
      }
      
      setPatientsLoading(false);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patients');
      setPatientsLoading(false);
    }
  };
  
  const handleAssignPatients = async () => {
    try {
      setLoading(true);
      
      // Make sure we have a valid doctorId
      const doctorId = selectedDoctor?.doctorInfo?.doctorid;
      
      if (!doctorId) {
        console.error('Doctor ID is undefined in handleAssignPatients');
        setError('Doctor ID not found');
        setLoading(false);
        return;
      }
      
      // Log the doctorId and selectedPatients for debugging
      console.log('Assigning patients to doctor:', { doctorId, selectedPatients });
      
      // Make the API call to assign patients
      const response = await axios.post(`${API_URL}/api/doctors/${doctorId}/patients/bulk`, {
        patientIds: selectedPatients
      }, {
        withCredentials: true
      });
      
      console.log('Assignment response:', response.data);
      
      // Reset the patient selection
      setSelectedPatients([]);
      setShowPatientAssignmentModal(false);
      
      // Re-fetch the doctor's details including the updated patient list
      await fetchDoctorDetails(doctorId);
      
      // Show success message
      setError(null);
      
      // Set loading to false
      setLoading(false);
    } catch (err) {
      console.error('Error assigning patients:', err);
      
      // Check if error is due to patients already assigned to other doctors
      if (err.response?.status === 409 && err.response.data?.alreadyAssignedPatients) {
        // Get the list of already assigned patient IDs
        const alreadyAssigned = err.response.data.alreadyAssignedPatients;
        
        // Get the names of these patients for better user feedback
        const assignedNames = allPatients
          .filter(p => alreadyAssigned.includes(p.patientid))
          .map(p => `${p.firstname} ${p.lastname}`)
          .join(', ');
        
        setError(`The following patients are already assigned to other doctors: ${assignedNames}`);
      } else {
        setError('Failed to assign patients to doctor: ' + (err.response?.data?.message || err.message));
      }
      
      setLoading(false);
    }
  };
  // Fetch doctors list
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/doctors`, {
        withCredentials: true
      });
      
      setDoctors(response.data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors');
      setLoading(false);
    }
  };

  // Fetch doctor details
  const fetchDoctorDetails = async (doctorId) => {
    console.log('Fetching doctor details for doctor ID:', doctorId);
    
    try {
      setLoading(true);
      
      const response = await axios.get(`${API_URL}/api/doctors/${doctorId}`, {
        withCredentials: true
      });
      
      console.log('Doctor details response:', response.data);
      
      // Find the base doctor information
      const doctor = doctors.find(d => d.doctorid === Number(doctorId));
      
      if (!doctor) {
        console.error('Doctor not found in doctors array', { doctorId, doctors });
        setError('Doctor not found in the list. Please refresh the page.');
        setLoading(false);
        return;
      }
      
      // Update the selectedDoctor state with combined information
      setSelectedDoctor({
        ...response.data,
        doctorInfo: doctor
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching doctor details:', err);
      setError('Failed to load doctor details: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };
  
  // Delete a doctor
  const handleDeleteDoctor = async (doctorid, userid, username) => {
    if (!window.confirm(`Are you sure you want to delete ${username}? This action cannot be undone`)) {
      return;
    }
    
    try {
      setLoading(true);
  
      // First try to delete doctor record
      if (doctorid) {
        try {
          await axios.delete(`${API_URL}/api/doctors/${doctorid}`, {
            withCredentials: true
          });
        } catch (err) {
          console.error("Error deleting doctor record:", err);
        }
      }
      
      // Then delete user account
      await axios.delete(`${API_URL}/api/auth/users/${userid}`, {
        withCredentials: true
      });
    
      // Update doctors list and reset selected doctor if it was deleted
      await fetchDoctors();
      if (selectedDoctor && selectedDoctor.doctorInfo && selectedDoctor.doctorInfo.doctorid === doctorid) {
        setSelectedDoctor(null);
      }
      
    } catch (err) {
      console.error('Error deleting doctor:', err);
      setError('Failed to delete doctor');
    } finally {
      setLoading(false);
    }
  };

  // Create a new doctor
  const handleCreateDoctor = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Create user account first
      const userResponse = await axios.post(`${API_URL}/api/auth/register`, {
        Username: newDoctor.username,
        Password: newDoctor.password,
        Role: 'Doctor'
      }, {
        withCredentials: true
      });
      // Get the userid from the created user account
      const userid = userResponse.data.userid;

      // Create doctor profile with the userid
      try {
        await axios.post(`${API_URL}/api/doctors`, {
          userid: userid,
          firstname: newDoctor.firstname,
          lastname: newDoctor.lastname,
          specialization: newDoctor.specialization,
          phonenumber: newDoctor.phonenumber,
          email: newDoctor.email
        }, {
          withCredentials: true
        });
      } catch (err) {
        console.error("Failed to create doctor record:", err);
        // Clean up by deleting the user account if doctor record creation fails
        await axios.delete(`${API_URL}/api/auth/users/${userid}`, {
          withCredentials: true
        });
        throw new Error("Failed to create complete doctor profile");
      }

      // Reset form and update display
      setNewDoctor({
        username: '',
        password: '',
        firstname: '',
        lastname: '',
        specialization: '',
        email: '',
        phonenumber: ''
      });
      
      setShowDoctorForm(false);
      await fetchDoctors();
      setError(null);
      
    } catch (err) {
      console.error('Failed to create doctor:', err);
      setError('Failed to create new doctor account');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh when patient assignment changes
  const handleRefreshNeeded = () => {
    if (selectedDoctor && selectedDoctor.doctorInfo) {
      fetchDoctorDetails(selectedDoctor.doctorInfo.doctorid);
    }
  };

  if (loading && !doctors.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading doctor information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between w-full">
          <h2 className="text-2xl font-bold">Doctor Management</h2>
          
          {!isModifyMode ? (
            <button
              onClick={() => setIsModifyMode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:translate-y-1 transition-transform"
            >
              Modify Doctors
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsModifyMode(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 active:translate-y-1 transition-transform"
              >
                <ChevronLeft className="h-5 w-5 inline mr-1" />
                Back
              </button>
              <button
                onClick={() => setShowDoctorForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:bg-gradient-to-bl active:translate-y-1 transition-transform flex items-center"
              >
                <UserPlus className="h-5 w-5 mr-1" />
                Add Doctor
              </button>
            </div>
          )}
        </div>
        
        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchDoctors();
              }} 
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              Retry
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Main content area */}
          {selectedDoctor ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  Doctor Details: {selectedDoctor.doctorInfo?.firstname} {selectedDoctor.doctorInfo?.lastname}
                </h3>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to List
                </button>
              </div>
              
              {/* Doctor Statistics */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold mb-4">Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Total Patients</div>
                    <div className="text-2xl font-bold">
                      {selectedDoctor.statistics && selectedDoctor.statistics.unique_patients || 0}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Completed Appointments</div>
                    <div className="text-2xl font-bold">
                      {selectedDoctor.statistics && selectedDoctor.statistics.completed_appointments || 0}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Upcoming Appointments</div>
                    <div className="text-2xl font-bold">
                      {selectedDoctor.statistics && selectedDoctor.statistics.upcoming_appointments || 0}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Button to assign patients */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!selectedDoctor.doctorInfo?.doctorid) {
                      setError('Doctor ID not found');
                      return;
                    }
                    setShowPatientAssignmentModal(true);
                    fetchAllPatients();
                    setSelectedPatients([]);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Assign Patients
                </button>
              </div>
              
              {/* Patient List - Now using the new component */}
              <AssignedPatientsList 
                selectedDoctor={selectedDoctor} 
                onRefreshNeeded={handleRefreshNeeded} 
              />
            </div>
          ) : (
            /* Doctor List Table */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specialization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Patients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upcoming Appointments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctors.length > 0 ? (
                    doctors.map((doctor) => (
                      <tr key={doctor.doctorid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {doctor.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doctor.specialization || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doctor.patient_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doctor.upcoming_appointments || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap flex items-center space-x-2">
                          <button
                            onClick={() => fetchDoctorDetails(doctor.doctorid)}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                          >
                            View Details
                          </button>
                          
                          {isModifyMode && (
                            <button
                              onClick={() => handleDeleteDoctor(doctor.doctorid, doctor.userid, doctor.username)}
                              className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center"
                            >
                              <MinusCircle className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No doctors found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Doctor Modal */}
      {showDoctorForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md"> 
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create New Doctor Account</h3>
              <button
                onClick={() => setShowDoctorForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateDoctor}>
              <div className="space-y-4">
                {/* Username field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={newDoctor.username}
                    onChange={(e) => setNewDoctor({...newDoctor, username: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                
                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({...newDoctor, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={newDoctor.firstname}
                    onChange={(e) => setNewDoctor({...newDoctor, firstname: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                
                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={newDoctor.lastname}
                    onChange={(e) => setNewDoctor({...newDoctor, lastname: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                
                {/* Specialization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialization</label>
                  <input
                    type="text"
                    value={newDoctor.specialization}
                    onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                
                {/* Phone number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    value={newDoctor.phonenumber}
                    onChange={(e) => setNewDoctor({...newDoctor, phonenumber: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowDoctorForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Assignment Modal */}
      {showPatientAssignmentModal && selectedDoctor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Assign Patients to Dr. {selectedDoctor.doctorInfo?.firstname} {selectedDoctor.doctorInfo?.lastname}
              </h3>
              <button
                onClick={() => setShowPatientAssignmentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
              {/* Left side - Patient Selection */}
              <div className="w-full md:w-1/2">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Patients</label>
                  <input
                    type="text"
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or phone..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                
                <div className="border border-gray-200 rounded-lg h-96 overflow-y-auto">
                  {patientsLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {allPatients
                        .filter(patient => {
                          if (!patientSearchQuery) return true;
                          const fullName = `${patient.firstname} ${patient.lastname}`.toLowerCase();
                          const query = patientSearchQuery.toLowerCase();
                          return (
                            fullName.includes(query) || 
                            (patient.email && patient.email.toLowerCase().includes(query)) || 
                            (patient.phonenumber && patient.phonenumber.includes(query))
                          );
                        })
                        .map(patient => (
                          <div key={patient.patientid} className="p-3 hover:bg-gray-50">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`patient-${patient.patientid}`}
                                checked={selectedPatients.includes(patient.patientid)}
                                onChange={() => {
                                  setSelectedPatients(prev => 
                                    prev.includes(patient.patientid)
                                      ? prev.filter(id => id !== patient.patientid)
                                      : [...prev, patient.patientid]
                                  );
                                }}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                              />
                              <label htmlFor={`patient-${patient.patientid}`} className="flex-1 cursor-pointer">
                                <div className="font-medium">{patient.firstname} {patient.lastname}</div>
                                <div className="text-sm text-gray-500">
                                  {patient.email || 'No email'} • {patient.phonenumber || 'No phone'}
                                </div>
                              </label>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right side - Selected Patients */}
              <div className="w-full md:w-1/2">
                <div className="mb-4">
                  <h4 className="text-lg font-medium">Selected Patients ({selectedPatients.length})</h4>
                  <p className="text-sm text-gray-500">
                    These patients will be assigned to Dr. {selectedDoctor.doctorInfo?.firstname} {selectedDoctor.doctorInfo?.lastname}
                  </p>
                </div>
                
                <div className="border border-gray-200 rounded-lg h-96 overflow-y-auto">
                  {selectedPatients.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No patients selected</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {selectedPatients.map(patientId => {
                        const patient = allPatients.find(p => p.patientid === patientId);
                        if (!patient) return null;
                        
                        return (
                          <div key={patient.patientid} className="p-3 hover:bg-gray-50">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{patient.firstname} {patient.lastname}</div>
                                <div className="text-sm text-gray-500">
                                  {patient.email || 'No email'} • {patient.phonenumber || 'No phone'}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedPatients(prev => 
                                    prev.filter(id => id !== patient.patientid)
                                  );
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowPatientAssignmentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignPatients}
                disabled={selectedPatients.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-400"
              >
                Assign {selectedPatients.length} Patient{selectedPatients.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorManagement;