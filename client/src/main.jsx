import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import App from './App';
import './index.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.warn);
  });
}

// Adjust fixed-position elements when soft keyboard opens (iOS Safari)
if ('visualViewport' in window) {
  window.visualViewport.addEventListener('resize', () => {
    const offset = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
    document.documentElement.style.setProperty('--keyboard-height', `${offset}px`);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
