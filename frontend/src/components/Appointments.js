import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Calendar, Clock, Edit, Trash2, X, Check, Filter } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || '';

function Appointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [patients, setPatients] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showPatientSelector, setShowPatientSelector] = useState(false);
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [editingAppointment, setEditingAppointment] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editFormData, setEditFormData] = useState({
      patientID: '',
      doctorID: '',
      appointmentDate: '',
      AppointmentTime: new Date().toTimeString().slice(0, 5),
      reasonForVisit: '',
      status: ''
    });
  
    const [editForm, setEditForm] = useState(false);
    
    // Form state for new appointment
    const [newAppointment, setNewAppointment] = useState({
        PatientID: '',
        AppointmentDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        AppointmentTime: '',
        ReasonForVisit: '',
        Status: 'Pending'
    });

  // Get user information
    const userRole = localStorage.getItem('userRole');
  
    useEffect(() => {
        fetchAppointments();
        fetchPatients(); // We need the list of patients for the appointment form
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/appointments`, {
            withCredentials: true
            });
            setAppointments(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError('Failed to load appointments. Please try again later.');
            setLoading(false);
        }
    };

    // Function to handle updating an appointment
    const handleUpdateAppointment = async (e) => {
      e.preventDefault();
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || '';
        
        await axios.put(`${API_URL}/api/appointments/${editingAppointment.appointmentid}`, {
          PatientID: editFormData.patientID,
          DoctorID: editingAppointment.doctorid, // Keep the same doctor ID
          AppointmentDate: editFormData.appointmentDate,
          AppointmentTime: editFormData.appointmentTime,
          ReasonForVisit: editFormData.reasonForVisit,
          Status: editFormData.status
        }, {
          withCredentials: true
        });
        
        // Close the form and refresh appointment list
        setShowEditForm(false);
        // You need to add a function to fetch appointments or refresh the current view
        fetchAppointments(); // Make sure this function exists to refresh the appointments list
        
      } catch (error) {
        console.error('Error updating appointment:', error);
        // You might want to add error handling here
      }
    };

    const fetchPatients = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/doctors/my-patients`, {
            withCredentials: true
        });
            setPatients(response.data);
        } catch (err) {
            console.error('Error fetching patients:', err);
        // show an error in the dropdown if this fails
        }
    };

    const handleInputChange = (e) => {
        setNewAppointment({ ...newAppointment, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
          // Log the form data for debugging
          console.log("Submit triggered with form data:", newAppointment);
          
          // Check for required fields
          if (!newAppointment.PatientID) {
            console.error("PatientID is missing");
            setError('Please select a patient');
            return;
          }
          
          if (!newAppointment.AppointmentDate) {
            console.error("AppointmentDate is missing");
            setError('Please select an appointment date');
            return;
          }
          
          if (!newAppointment.AppointmentTime) {
            console.error("AppointmentTime is missing");
            setError('Please select an appointment time');
            return;
          }
          
          // Create appointment data with all required fields
          // Include DoctorID as 1 (default) - this will be overridden by the backend
          // for doctor users based on their authentication
          const appointmentData = {
            PatientID: parseInt(newAppointment.PatientID, 10),
            AppointmentDate: newAppointment.AppointmentDate,
            AppointmentTime: newAppointment.AppointmentTime,
            ReasonForVisit: newAppointment.ReasonForVisit || "Regular check-up",
            Status: newAppointment.Status
          };
          
          console.log("Sending appointment data to API:", appointmentData);
          console.log("API URL:", `${API_URL}/api/appointments`);
          
          const response = await axios.post(`${API_URL}/api/appointments`, appointmentData, {
            withCredentials: true
          });
          
          console.log("API response:", response.data);
          
          // Reset form and fetch updated appointments
          setNewAppointment({
            PatientID: '',
            AppointmentDate: new Date().toISOString().split('T')[0], // Keep default date as today
            AppointmentTime: new Date().toTimeString().slice(0, 5),
            ReasonForVisit: '',
            Status: 'Pending'
          });
          setShowAddForm(false);
          fetchAppointments();
        } catch (err) {
          console.error('Error adding appointment:', err);
          
          // Log detailed error information
          if (err.response) {
            console.error("Error response data:", JSON.stringify(err.response.data));
            console.error("Error response status:", err.response.status);
            
            // More detailed logging for 400 errors
            if (err.response.status === 400) {
              console.error("Validation errors:", err.response.data.errors);
              
              if (err.response.data.errors && err.response.data.errors.length > 0) {
                // Format validation errors into a readable message
                const errorMessages = err.response.data.errors.map(e => e.msg).join('; ');
                setError(`Validation failed: ${errorMessages}`);
              } else if (err.response.data.error) {
                setError(err.response.data.error);
              } else {
                setError('Invalid request. Please check your form data.');
              }
            } else {
              // Use error message from API if available
              if (err.response.data && err.response.data.error) {
                setError(err.response.data.error);
              } else {
                setError(`Failed to add appointment. Server returned status ${err.response.status}`);
              }
            }
          } else if (err.request) {
            console.error("No response received:", err.request);
            setError('Failed to add appointment. No response from server.');
          } else {
            console.error("Error message:", err.message);
            setError(`Failed to add appointment: ${err.message}`);
          }
        }
      };

  const handleDelete = async (appointmentId) => {
    try {
      await axios.delete(`${API_URL}/api/appointments/${appointmentId}`, {
        withCredentials: true
      });
      fetchAppointments();
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError('Failed to delete appointment. Please try again.');
    }
  };

  const filteredPatients = patients.filter(patient => {
    if (!patientSearchQuery) return true;
    
    const fullName = `${patient.firstname} ${patient.lastname}`.toLowerCase();
    const query = patientSearchQuery.toLowerCase();
    
    return fullName.includes(query) || 
      (patient.email && patient.email.toLowerCase().includes(query)) || 
      (patient.phonenumber && patient.phonenumber.includes(query));
  });


  // Filter appointments based on search query
  const filteredAppointments = appointments.filter(appointment => {
    // We'll need to fetch patient details for each appointment to make this work better
    // For now, ima just filter by date and status
    return (
      appointment.appointmentdate?.includes(searchQuery) ||
      appointment.status?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAppointments = filteredAppointments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Find patient name from patient ID
  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.patientid === patientId);
    return patient ? `${patient.firstname} ${patient.lastname}` : 'Unknown Patient';
  };

  if (loading) return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2">Loading appointments...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold">Appointment Management</h2>
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
              <h3 className="text-lg font-medium mb-4">Cancel this appointment?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  No, Keep It
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes, Cancel Appointment
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
              placeholder="Search appointments by date or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex space-x-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Schedule Appointment
            </button>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentAppointments.length > 0 ? (
                currentAppointments.map(appointment => (
                  <tr key={appointment.appointmentid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {getPatientName(appointment.patientid)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar size={16} className="text-gray-500 mr-2" />
                        <span className="text-gray-900">{formatDate(appointment.appointmentdate)}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <Clock size={16} className="text-gray-500 mr-2" />
                        <span className="text-gray-500">{appointment.appointmenttime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate">
                        {appointment.reasonforvisit || 'No reason provided'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'Canceled' ? 'bg-red-100 text-red-800' :
                        appointment.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                      {/* editing */}
                        <button
                        title="Edit Appointment Details"
                          onClick={() => {
                            setEditingAppointment(appointment);
                            setEditFormData({
                              patientID: appointment.patientid,
                              doctorID: appointment.doctorid,
                              appointmentDate: appointment.appointmentdate,
                              appointmentTime: appointment.appointmenttime,
                              reasonForVisit: appointment.reasonforvisit ||'',
                              status: appointment.status
                            });

                            setShowEditForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={18} />
                        </button>
                        {/* delete */}
                        <button
                          onClick={() => setConfirmDelete(appointment.appointmentid)}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel Appointment"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    {searchQuery 
                      ? 'No appointments match your search criteria.' 
                      : 'No appointments found. Schedule a new appointment to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 mb-6 px-6">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAppointments.length)} of {filteredAppointments.length} patients
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
      
      {/* Edit Appointment Modal */}
      {showEditForm && editingAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit Appointment</h3>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateAppointment}>
              <div className="space-y-4">
                {/* Patient selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient</label>
                  <select
                    value={editFormData.patientID}
                    onChange={(e) => setEditFormData({...editFormData, patientID: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="">Select Patient</option>
                    {patients.map((patient) => (
                      <option key={patient.patientid} value={patient.patientid}>
                        {patient.firstname} {patient.lastname}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Appointment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Appointment Date</label>
                  <input
                    type="date"
                    value={editFormData.appointmentDate}
                    onChange={(e) => setEditFormData({...editFormData, appointmentDate: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                
                {/* Appointment Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Appointment Time</label>
                  <input
                    type="time"
                    value={editFormData.appointmentTime}
                    onChange={(e) => setEditFormData({...editFormData, appointmentTime: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                
                {/* Reason for Visit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Visit</label>
                  <textarea
                    value={editFormData.reasonForVisit}
                    onChange={(e) => setEditFormData({...editFormData, reasonForVisit: e.target.value})}
                    rows="3"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  ></textarea>
                </div>
                
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Canceled">Canceled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Appointment Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Schedule New Appointment</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
{/* Replace just the patient selector div with this version */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Patient *
  </label>
  <div className="relative">
    {/* Combined search input and dropdown trigger */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder="Search patients..."
        value={newAppointment.PatientID ? getPatientName(newAppointment.PatientID) : patientSearchQuery}
        onChange={(e) => {
          // If there was a patient selected, clear it when user starts typing
          if (newAppointment.PatientID) {
            setNewAppointment({...newAppointment, PatientID: ''});
          }
          setPatientSearchQuery(e.target.value);
          setShowPatientSelector(true);
        }}
        onFocus={() => {
          // When focusing, if a patient is selected, clear the input to allow new search
          if (newAppointment.PatientID) {
            setPatientSearchQuery('');
          }
          setShowPatientSelector(true);
        }}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {/* Add clear button when patient is selected */}
      {newAppointment.PatientID && (
        <button
          type="button"
          onClick={() => {
            setNewAppointment({...newAppointment, PatientID: ''});
            setPatientSearchQuery('');
            setTimeout(() => document.querySelector('input[placeholder="Search patients..."]').focus(), 0);
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
    
    {/* Patient dropdown */}
    {showPatientSelector && !newAppointment.PatientID && (
      <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
        <div className="max-h-60 overflow-y-auto p-1">
          {filteredPatients.length > 0 ? (
            filteredPatients.map(patient => (
              <div
                key={patient.patientid}
                onClick={() => {
                  setNewAppointment({...newAppointment, PatientID: patient.patientid});
                  setPatientSearchQuery('');
                  setShowPatientSelector(false);
                }}
                className="px-3 py-2 cursor-pointer rounded-md hover:bg-gray-100"
              >
                <div className="font-medium">{patient.firstname} {patient.lastname}</div>
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>DOB: {new Date(patient.dob).toLocaleDateString()}</span>
                  {patient.phonenumber && <span>{patient.phonenumber}</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 text-center">No patients found</div>
          )}
        </div>
      </div>
    )}
  </div>
</div>
                    
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Appointment Date *
                    </label>
                    <input
                        type="date"
                        name="AppointmentDate"
                        value={newAppointment.AppointmentDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    </div>
                    
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Appointment Time *
                    </label>
                    <input
                        type="time"
                        name="AppointmentTime"
                        value={newAppointment.AppointmentTime}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    </div>
                    
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for Visit
                    </label>
                    <textarea
                        name="ReasonForVisit"
                        value={newAppointment.ReasonForVisit}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                    </div>
                    
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                    </label>
                    <select
                        name="Status"
                        value={newAppointment.Status}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Canceled">Canceled</option>
                        <option value="Completed">Completed</option>
                    </select>
                    </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6">
                    <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                    Cancel
                    </button>
                    <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                    Schedule Appointment
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;