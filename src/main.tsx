import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryProvider } from './components/common/QueryProvider';
import { useAuthStore } from './store';
import { applyTheme } from './styles/themes';
import { initializeDemoData } from './services';
import './styles/index.css';

// Initialize auth from stored session
useAuthStore.getState().initialize();

// Apply initial theme
const initialUserType = useAuthStore.getState().userType;
applyTheme(initialUserType);

// Initialize demo data only if using mock data
if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
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
    <ErrorBoundary>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
