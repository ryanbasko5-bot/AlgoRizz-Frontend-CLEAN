import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AlgorizGEOApp from './src/AlgorizGEOApp'
import LoginPage from './src/components/LoginPage'

// App Switcher - Toggle between legacy AEO tool and new GEO platform
function AppSwitcher() {
  const [mode, setMode] = useState('geo'); // 'aeo' | 'geo'
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load persisted auth on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('algorizz_authenticated');
    const userEmail = localStorage.getItem('algorizz_user');
    if (authStatus === 'true' && userEmail) {
      setIsAuthenticated(true);
    }
  }, []);

  // HARD-LOCK: Temporarily render only the LoginPage to validate deployment
  return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppSwitcher />
  </React.StrictMode>,
)
