import React, { useState, useEffect } from "react";
import './App.css';

// Simplified debug version of App.js
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔍 App.js useEffect running...');
    try {
      const authToken = localStorage.getItem("authToken");
      console.log('🔑 Auth token found:', !!authToken);
      setIsLoggedIn(!!authToken);
    } catch (err) {
      console.error('❌ Error in App.js useEffect:', err);
      setError(err.message);
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>❌ Error occurred:</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>🔐 Login Required</h2>
        <p>Please log in to continue.</p>
        <button onClick={() => setIsLoggedIn(true)}>Debug: Skip Login</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>✅ App is working!</h2>
      <p>This is a debug version of the app.</p>
      <button onClick={() => setIsLoggedIn(false)}>Logout</button>
    </div>
  );
}

export default App; 