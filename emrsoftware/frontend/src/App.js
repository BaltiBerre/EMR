import React, { useEffect, useState } from 'react';

function App() {
  const [backendStatus, setBackendStatus] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/api/health')
      .then(response => response.json())
      .then(data => setBackendStatus(data.message))
      .catch(error => console.error('Error:', error));
  }, []);

  return (
    <div className="App">
      <h1>EMR Software</h1>
      <p>Backend status: {backendStatus}</p>
    </div>
  );
}

export default App;