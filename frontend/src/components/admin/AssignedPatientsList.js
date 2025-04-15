// EMR/frontend/src/components/admin/AssignedPatientsList.js
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, X, UserMinus } from 'lucide-react';
import axios from 'axios';

function AssignedPatientsList({ selectedDoctor, onRefreshNeeded }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage, setPatientsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || '';

  // Apply search filter whenever selectedDoctor or searchQuery changes
  useEffect(() => {
    if (selectedDoctor && selectedDoctor.patients) {
      setIsLoading(true);
      // Filter patients based on search query
      const filtered = selectedDoctor.patients.filter(patient => {
        const fullName = `${patient.firstname} ${patient.lastname}`.toLowerCase();
        const diagnosis = (patient.latest_diagnosis || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        
        return fullName.includes(query) || diagnosis.includes(query);
      });
      
      setFilteredPatients(filtered);
      setCurrentPage(1); // Reset to first page when filter changes
      setIsLoading(false);
    }
  }, [selectedDoctor, searchQuery]);

  // Calculate pagination
  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  // Function to change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Function to remove a patient from the doctor
  const handleRemovePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to remove this patient from the doctor?')) {
      return;
    }
    
    try {
      setRemoveLoading(true);
      setError(null);
      
      // Get the doctor ID
      const doctorId = selectedDoctor.doctorInfo.doctorid;
      
      if (!doctorId) {
        setError('Doctor ID not found');
        setRemoveLoading(false);
        return;
      }
      
      // Make API call to remove patient from doctor
      await axios.delete(`${API_URL}/api/doctors/${doctorId}/patients/${patientId}`, {
        withCredentials: true
      });
      
      // Call the parent's refresh method to update data
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
      
      // Update the filtered patients list locally to avoid needing a full refresh
      setFilteredPatients(prevPatients => 
        prevPatients.filter(patient => patient.patientid !== patientId)
      );
      
    } catch (err) {
      console.error('Error removing patient from doctor:', err);
      setError(`Failed to remove patient: ${err.response?.data?.message || err.message}`);
    } finally {
      setRemoveLoading(false);
    }
  };

  // Calculate page range to display
  const getPageRange = () => {
    const delta = 1; // Number of pages to show before and after current page
    let range = [];
    
    // Always include first page
    range.push(1);
    
    // Calculate start and end of page range around current page
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);
    
    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      range.push('...');
    }
    
    // Add pages around current page
    for (let i = rangeStart; i <= rangeEnd; i++) {
      range.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      range.push('...');
    }
    
    // Always include last page if it exists
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    return range;
  };

  if (!selectedDoctor || !selectedDoctor.patients) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="text-center text-gray-500">
          No doctor selected or no patient data available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-lg">Patient List</h4>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading patients...</span>
        </div>
      ) : (
        <>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPatients.length > 0 ? (
                  currentPatients.map((patient) => (
                    <tr key={patient.patientid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {`${patient.firstname} ${patient.lastname}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {patient.visit_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="max-w-xs truncate">
                          {patient.latest_diagnosis || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleRemovePatient(patient.patientid)}
                          className="px-3 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 inline-flex items-center"
                          disabled={removeLoading}
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      {searchQuery 
                        ? 'No patients match your search criteria' 
                        : 'No patients found for this doctor'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls - only show if we have patients */}
          {filteredPatients.length > patientsPerPage && (
            <div className="flex justify-between items-center mt-4 px-2">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstPatient + 1}-
                {Math.min(indexOfLastPatient, filteredPatients.length)} of {filteredPatients.length} patients
              </div>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {getPageRange().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-3 py-2">...</span>
                  ) : (
                    <button
                      key={`page-${page}`}
                      onClick={() => paginate(page)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
                
                <button
                  onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Rows per page:</span>
                <select
                  value={patientsPerPage}
                  onChange={(e) => {
                    setPatientsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AssignedPatientsList;