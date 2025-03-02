// PatientDashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, FileText, User, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const PatientDashboard = () => {
  // initialises appointments and medicalrecords, inputs an empty array object 
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  // initialises the loading status to true
  const [loading, setLoading] = useState(true);
  // error state null
  const [error, setError] = useState(null);

  // calls the function which retrieves the backend data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // fetches data from backend, async so to not crash immediately and lets know that there's wait time
  const fetchDashboardData = async () => {
    try {
      // retrieves token from the local storage
      const token = localStorage.getItem('token');
      // error case for token not being there
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      // creating a bearer token 
      const headers = { 
        Authorization: `Bearer ${token}`
      };

      // Fetch appointments
      const appointmentsResponse = await axios.get(`${API_URL}/api/appointments`, { headers });
      setAppointments(appointmentsResponse.data || []);

      // Fetch medical records
      const recordsResponse = await axios.get(`${API_URL}/api/medical-records`, { headers });
      setMedicalRecords(recordsResponse.data || []);

      // sets the loading to false
      setLoading(false);

      // if any error arises logs it to the console
      // and 
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Patient Dashboard
        </h1>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-600">{error}</p>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Appointments Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Calendar className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Your Appointments</h2>
              </div>
              <div className="space-y-4">
                {appointments.length > 0 ? (
                  appointments.map((appointment) => (
                    <div 
                      key={appointment.appointmentid} 
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {new Date(appointment.appointmentdate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {appointment.appointmenttime}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          appointment.status === 'Scheduled' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                      {appointment.reasonforvisit && (
                        <p className="text-sm text-gray-600 mt-2">
                          Reason: {appointment.reasonforvisit}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No appointments scheduled
                  </p>
                )}
              </div>
            </div>

            {/* Medical Records Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Recent Medical Records</h2>
              </div>
              <div className="space-y-4">
                {medicalRecords.length > 0 ? (
                  medicalRecords.map((record) => (
                    <div 
                      key={record.recordid} 
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <p className="font-medium">
                        Visit Date: {new Date(record.visitdate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Diagnosis:</span> {record.diagnosis}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Treatment:</span> {record.treatment}
                      </p>
                      {record.notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Notes:</span> {record.notes}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No medical records found
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;