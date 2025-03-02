import React, { useState, useEffect } from 'react';
import axios from 'axios';


const DoctorList = () => {
  // Declares a doctors state variable initialized as an empty array
  const [doctors, setDoctors] = useState([]);
  // Declares selectedDoctor state initialized to null 
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  // Declares loading state initialized to true
  const [loading, setLoading] = useState(true);
  // Declares error state initialized to null
  const [error, setError] = useState(null);

  // calls the fetch doctors function from the backend
  useEffect(() => {
    fetchDoctors();
  }, []);


  const fetchDoctors = async () => {
    try {
      // retrieves token and response from backend api point
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:4000/api/doctors', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDoctors(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors');
      setLoading(false);
    }
  };
  
  const fetchDoctorDetails = async (doctorId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:4000/api/doctors/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDoctor(response.data);
    } catch (err) {
      console.error('Error fetching doctor details:', err);
      setError('Failed to load doctor details');
    }
  };
  

  if (loading) {
    return <div className="p-4">Loading doctor information...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Doctor List Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Doctor List</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
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
                {doctors.map((doctor) => (
                  <tr key={doctor.userid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doctor.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doctor.patient_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doctor.upcoming_appointments}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => fetchDoctorDetails(doctor.userid)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Doctor Details Card */}
      {selectedDoctor && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-xl font-bold">Doctor Details</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* Statistics */}
              <div>
                <h4 className="font-semibold mb-4">Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Patients</div>
                    <div className="text-2xl font-bold">
                      {selectedDoctor.statistics.unique_patients}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Completed Appointments</div>
                    <div className="text-2xl font-bold">
                      {selectedDoctor.statistics.completed_appointments}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Upcoming Appointments</div>
                    <div className="text-2xl font-bold">
                      {selectedDoctor.statistics.upcoming_appointments}
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient List */}
              <div>
                <h4 className="font-semibold mb-4">Patient List</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Visit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visit Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Latest Diagnosis
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedDoctor.patients.map((patient) => (
                        <tr key={patient.patientid}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {`${patient.firstname} ${patient.lastname}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(patient.last_visit).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {patient.visit_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {patient.latest_diagnosis || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorList;