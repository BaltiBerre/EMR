import React, { useState, useEffect } from 'react';
import * as math from 'mathjs';
import axios from 'axios';
import { X, Plus, Check, UserMinus, UserCheck, MinusCircle, Aperture } from 'lucide-react' ;

// defines the component
function AccountManagement() {
    // allows for the implementation of a new doctor by initialising an object with multiple properties
    const [newDoctor, setNewDoctor] = useState({
        username: '',
        password: '',
        firstname: '',
        lastName: '',
        specialization: '',
        email: '',
        phonenumber: ''
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
    const [isModifyMode, setIsModifyMode] = useState(false)
    const [showDoctorForm, setShowDoctorForm] = useState(false);
    const API_URL = process.env.REACT_APP_API_URL || '';
    const patientsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);

// Fetches the doctor every time that the selectedDoctor state variable changes
useEffect( () => {
    setLoading(true)
    fetchData();
}, [])

// encompassing function that calls both fetchPatients() and fetchDoctors() 
// also takes care of tracking the loading state
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

const fetchDoctors = async () => {
    try {
        // retrieves token from localStorage
        const token = localStorage.getItem('token')
        // makes an HTTP get request that returns a list of all doctors
        const response = await axios.get(`${API_URL}/api/doctors`, {
            headers: { Authorization: `Bearer ${token}`}
        });
        setDoctors(response.data)
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
    } catch(err) {
        console.error('Error fetching patients', err)
        setError('Failed to load patients')
    }}

    const handleDeleteDoctor = async(doctorid, userid, username) => {
        if (!window.confirm(`Are you sure you want to delete ${username}? This action cannot be undone`)) {
            return;
        }
        try {
        const token = localStorage.getItem('token');
    
        // tries to delete the doctor record first
        if (doctorid) {
            try {
                await axios.delete(`${API_URL}/api/doctors/${doctorid}`, {
                    headers: {Authorization: `bearers: ${token}` }
                })
            } catch (err) {
                console.error("Error deleting doctor record:", err);
            }
        }
        await axios.delete(`${API_URL}/api/auth/users/${userid}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    
        await fetchDoctors();
        
        setDoctors(prev => prev.filter(doc => doc.userid !== userid))
        setError(null);
    } catch (err) {
        console.error('Error deleting doctors', err);
        setError('Failed to delete doctor');
    } finally {
        setLoading(false);
    }
    } 

    // form that handles doctor creation
    // (e) because we're passing an event object in
const handleCreateDoctor = async (e) => {
    // stops browser from reloading the page
    e.preventDefault()

    try {
        setLoading(true);
        const token = localStorage.getItem('token')

        // api call to create new doctor 
        const userResponse = await axios.post(`${API_URL}/api/auth/register`, {
            Username: newDoctor.username,
            Password: newDoctor.password,
            Role: 'Doctor'
        }, {
            headers: {Authorization: `Bearer ${token}` }
        });
        
        // get the userid from the useraccounts table
        const userid = userResponse.data.userid

        // create the doctor record
        try {
        await axios.post(`${API_URL}/api/doctors`, {
            userid: userid,
            firstname: newDoctor.firstname,
            lastname: newDoctor.lastname,
            specialization: newDoctor.specialization,
            phonenumber: newDoctor.phonenumber,
            email: newDoctor.email
        }, {
            headers: {Authorization: `Bearer ${token}`}
        });
        } catch (err) {
            console.error("Failed to create doctor record:", err);
            await axios.delete(`${API_URL}/api/auth/users/${userid}`);
            throw new Error("Failed to create complete doctor profile")
        }

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
        await fetchDoctors(); // refresh
        setLoading(false);
        setError(null);
        
    } catch (err) {
        console.error('Failed to create doc:', err);
        setError('Failed to create new Doc account');
        setLoading(false);
    }



} 
    return (

        // shows the user that the data is being fetched
        // this is saying if `loading` == true, show this
        <div className="bg-white rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between w-full">
            <h2 className="text-2xl font-bold"> Account Management</h2>
            
            {/* UI functionality for adding doctors, on click shows add doctor and back button */}
            {!isModifyMode ? (
                <button
                onClick={() => setIsModifyMode(true)}
                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:translate-y-1 transition-transform'
                >
                    Modify
                </button>
            ): (
                    // On click reveals add doctor and back button
                <div className='flex space-x-2'>
                    <button
                        onClick={() => setIsModifyMode(false)}
                        className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 active:translate-y-1 transition-transform'
                    >
                        Back
                    </button>
                    <button
                    onClick={() => setShowDoctorForm(true)}
                    className="text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:focus:ring-cyan-800 font-medium rounded-lg px-3 py-1.5 text-sm active:translate-y-1 transition-transform"
                    >
                    <span className="text-xl mr-1"> Add Doctor</span>
                    </button>
                </div>
            )
            }
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
                        fetchData();
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
                        {doctors.map(doctor => (
                            <li 
                                key={doctor.userid} 
                                className="p-3 hover:bg-gray-50 flex justify-between items-center cursor-pointer"
                                onClick={() => setSelectedDoctor(doctor)}
                            >
                                <span>{doctor.username}</span>
                                {isModifyMode && (
                                    <MinusCircle
                                        className='h-5 w-5 text-red-500 hover:text-red-700'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log("about to delete:", doctor);
                                            console.log(`doctor id${doctor.doctorid} doctor id ${doctor.userid} and username     ${doctor.username}`)
                                            handleDeleteDoctor(doctor.doctorid, doctor.userid, doctor.username);
                                        }}
                                    />
                                )} 
  
                            </li>
                        ))}
                        {doctors.length === 0 && (
                            <li className="p-3 text-gray-500"> No Doctors Found</li>
                        )}
                    </ul>
                </div>

                {/* Patient List */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium mb-4"> Patients ({patients.length})</h3>
                                        {/* pagination controls */}
                                        {patients.length > patientsPerPage && (
                        // previous page
                        <div className="flex justify-center gap-1 mt-0">
                            {/* BACK BUTTON */}
                            <button
                            className="px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-0"
                            // ensures that it never goes below 1
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            // disables clicking this button if on the very first page
                            disabled={currentPage === 1}
                            >
                                
                                ←
                            </button>

                            <span>
                                {/* Calculates the amount of pages needed to fit all the patients */}
                                Page {currentPage} of {Math.ceil(patients.length / patientsPerPage)}
                            </span>
                            {/* Forwards button */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, math.ceil(patients.length/patientsPerPage)))}
                                disabled={currentPage === math.ceil(patients.length / patientsPerPage)}
                                className='px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-0'
                            >
                                →
                            </button>
                        </div>
                    )}
                    </div>
                    <ul className="border rounded-lg divide-y"> 
                        {patients
                            .slice((currentPage - 1) * patientsPerPage, currentPage * patientsPerPage)
                            .map(patient =>(
                                <li key={patient.patientid} className="p-3 hover:bg-gray-50">
                                    {patient.firstname} {patient.lastname}
                                </li>
                            ))}
                        {patients.length === 0 && (
                            <li className='p-3 text-gray-500'> No Patients Found </li>
                        )}
                    </ul>

                </div>
            </div>
        )}

            </div>
        
            {/* Doctor Form */}
            {showDoctorForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md"> 
                        <h3 className="text-xl font-bold mb-4"> Create New Doctor Account </h3>
                        
                        <form onSubmit={handleCreateDoctor}>
                            <div className="grid grid-cols-0 space-y-4">

                                {/* Username field */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700"> Username</label>
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
                                    <label className="block text-sm font-medium text-gray-700"> Password</label>
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
                                    <label className="block text-sm font-medium text-gray-700"> First Name</label>
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
                                    <label className="block text-sm font-medium text-gray-700"> Last Name</label>
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
                                    <label className="block text-sm font-medium text-gray-700"> Specialization</label>
                                    <input
                                        type="text"
                                        value={newDoctor.specialization}
                                        onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required
                                    />
                                </div>
                                {/* phone number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700"> Phone Number</label>
                                    <input
                                        type="text"
                                        value={newDoctor.phonenumber}
                                        onChange={(e) => setNewDoctor({...newDoctor, phonenumber: e.target.value})}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required
                                    />
                                </div>
                                {/* email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700"> Email </label>
                                    <input
                                        type="text"
                                        value={newDoctor.email}
                                        onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required
                                    />
                                </div>
                                
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                                    onClick={() => setShowDoctorForm(false)}
                                    >
                                        Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md"
                                >
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}


export default AccountManagement