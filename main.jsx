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

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div>
      {/* Quick Toggle (Dev Only) */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {/* Global Logout */}
        {isAuthenticated && (
          <button
            onClick={() => {
              localStorage.removeItem('algorizz_authenticated');
              localStorage.removeItem('algorizz_user');
              setIsAuthenticated(false);
            }}
            className="px-4 py-2 rounded-lg font-['Press_Start_2P'] text-xs border-2 border-[#FF1493] text-[#FF1493] hover:bg-[#FF1493] hover:text-[#0d0520] transition-all duration-200 shadow-[0_0_12px_rgba(255,20,147,0.6)]"
          >
            LOG OUT
          </button>
        )}
        <button
          onClick={() => setMode('aeo')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            mode === 'aeo' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
          }`}
        >
          Legacy AEO
        </button>
        <button
          onClick={() => setMode('geo')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            mode === 'geo' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
          }`}
        >
          GEO Platform
        </button>
      </div>

      {/* Render Active App (behind login gate) */}
      {mode === 'aeo' ? <App /> : <AlgorizGEOApp />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppSwitcher />
  </React.StrictMode>,
)
