// ── EINSTIEGSPUNKT ─────────────────────────────────────────
// Initialisiert React 18 und bindet die App an den DOM-Root.
// Capacitor-Plugins werden nach dem Laden der App aktiviert.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Globale CSS-Imports
import './index.css';

// React 18 createRoot für Concurrent Features
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
