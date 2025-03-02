// AdminDashboard.js
import React, { useState } from 'react';
import { Activity, LogOut, Plus } from 'lucide-react';
import PatientList from './components/PatientList';
import PatientOverview from './components/PatientOverview';
import DoctorList from './components/doctorList';
import DoctorManagement from './admin/DoctorManagement.js';


function AdminDashboard() {
  // initialises the activeTab state variable to patients-list
  const [activeTab, setActiveTab] = useState('patients-list');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">EMR Software</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                Backend Status: Healthy
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 border-b">
          <button 
            className={`px-6 py-3 font-medium ${
              activeTab === 'patients-list' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('patients-list')}
          >
            Patients List
          </button>
          <button
            className={`px-6 py-3 font-medium ${
                activeTab === 'doctor-management'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
              onClick={() => setActiveTab('doctor-management')}
            >
              Doctor Management
            </button>
          <button 
            className={`px-6 py-3 font-medium ${
              activeTab === 'doctors' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('doctors')}
          >
            Doctors
          </button>
        </div>

        {/* Content Area */}
        <div>
          {activeTab === 'patients-overview' && <PatientOverview />}
          {activeTab === 'patients-list' && <PatientList />}
          {activeTab === 'doctors' && <DoctorList />}
          {activeTab === 'doctor-management' && <DoctorManagement />}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;