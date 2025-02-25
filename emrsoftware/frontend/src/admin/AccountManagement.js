import React, { useState, useEffect } from 'react';
import axios from 'axios';

// defines the component
function AccountManagement() {
    // allows for the implementation of a new doctor by initialising an object with multiple properties
    const [newDoctor, setNewDoctor] = useState({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        specialization: '',
        email: '',
        phoneNumber: ''
    })
    // initialising state variables to track
    const [doctors, setDoctors] = useState([])
    const [patients, setPatients] = useState([])
    // selectedDoctor is set to null as we would only be using one Doctor at a time
    // null == nothing selected yet
    const [selectedDoctor, setSelectedDoctor] = useState(null)
    // selecetedPatient is set to an array, as a doctor can have multiple patients
    // an empty array is a valid initial state that won't cause errors when we iterate through it
    const [selectedPatient, setSelectedPatient] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const API_URL = process.env.REACT_APP_API_URL || '';


// Fetches the doctor every time that the selectedDoctor state variable changes
useEffect( () => {
    setLoading(true)

    const fetchData = async () => {
        try {
            // call both fetch functions
            await fetchDoctors();
            await fetchPatients();
            console.log("YESSIR")
            //set loading state to false
            setLoading(false);
        } catch (err) {
            console.error('Error calling fetchDoctors(); and fetchPatients();');
            setLoading(false);
        }
    };

    fetchData();
}, [])

const fetchDoctors = async () => {
    try {
        // retrieves token from localStorage
        const token = localStorage.getItem('token')
        // makes an HTTP get request that returns a list of all doctors
        const response = await axios.get(`${API_URL}/api/doctors`, {
            headers: { Authorization: `Bearer ${token}`}
        });
        setDoctors(response.data)
        setLoading(false)
        console.log("Fetch Doctors worked")
    } catch (err) {
        console.error('Error fetching doctors', err);
        setError('Failed to load doctors')
    }
};

const fetchPatients = async () => {
    try {
        // retrieve token from localStorage
        const token = localStorage.getItem('token')
        const response = await axios.get(`${API_URL}/api/patients`, {
            headers: {Authorization: `Bearer ${token}`}
        });
        setPatients(response.data)
        setLoading(false)
    } catch(err) {
        console.error('Error fetching patients', err)
        setError('Failed to load patients')
    }}
    return (

        // shows the user that the data is being fetched
        // this is saying if `loading` == true, show this
        <div className="bg-white rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold"> Account Management</h2>
            </div>
            <div className="p-6">
            {loading && (
                <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2"> Loading data...</span>
                </div>
            )}
        {/* if an error occurs while loading everything */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-600">{error}</p>
                    <button onClick={() => {
                        setLoading(true);
                        fetchDoctors();
                        fetchPatients();
                    }} 
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm">
                        Retry
                    </button>
                </div>
            )}
        {/* If no errors while data loaded, so succesful load*/}
        {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Doctors List*/}
                <div>
                    <h3 className="font-medium mb-4"> Doctors ({doctors.length})</h3>
                    <ul className="border rounded-lg divide-y">
                        {doctors.map(doctors => (
                            <li key={doctors.userid} className="p-3 hover:bg-gray-50">
                                {doctors.username}
                            </li>
                        ))}
                        {doctors.length === 0 && (
                            <li className="p-3 text-gray-500"> No Doctors Found</li>
                        )}
                    </ul>
                </div>

                {/* Patient List */}
                <div>
                    <h3 className="font-medium mb-4"> Patients ({patients.length})</h3>
                    <ul className="border rounded-lg divide-y"> 
                        {/* map() applies itself to each element of */}
                        {patients.map(patient => (
                            <li key={patient.patientid} className="p-3 hover:bg-gray-50">
                                {patient.firstname} {patient.lastname}
                            </li>
                        ))}
                        {patients.length === 0 && (
                            <li className="p-3 text-gray-500"> No Patients Found</li>
                        )}



                    </ul>
                </div>
            </div>
        )}

            </div>
        </div>
    )
}


export default AccountManagement