import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from './store';
import { applyTheme } from './styles/themes';
import { initializeDemoData } from './services';
import './styles/index.css';

// Apply initial theme
const initialUserType = useAuthStore.getState().userType;
applyTheme(initialUserType);

// Initialize demo data for development
if (import.meta.env.DEV) {
  initializeDemoData().then(() => {
    console.log('[App] Demo data ready');
  }).catch((error) => {
    console.error('[App] Failed to initialize demo data:', error);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
