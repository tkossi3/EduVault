import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if (import.meta.env.VITE_API_BASE_URL) {
  window.EDUVAULT_API_URL = import.meta.env.VITE_API_BASE_URL;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
