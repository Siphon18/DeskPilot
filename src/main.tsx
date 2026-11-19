import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { StandaloneLauncher } from './features/launcher/StandaloneLauncher';
import { ToastProvider } from './components/Toast';
import './styles/global.css';

// Check whether this window is the compact Standalone Quick Launcher or the Main Dashboard
const isLauncherMode =
  new URLSearchParams(window.location.search).get('mode') === 'launcher' ||
  (typeof window !== 'undefined' &&
    window.location.search.includes('launcher'));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      {isLauncherMode ? <StandaloneLauncher /> : <App />}
    </ToastProvider>
  </React.StrictMode>
);
