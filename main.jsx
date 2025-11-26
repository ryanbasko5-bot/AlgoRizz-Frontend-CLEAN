import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // This loads your AlgoRizz component
import './index.css'; // Assuming this file exists from the Vite setup

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);