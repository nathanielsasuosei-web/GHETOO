import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SiteProvider } from './context/SiteContext';
import { PlayerProvider } from './context/PlayerContext';
import { SupportProvider } from './context/SupportContext';
import { ToastProvider } from './context/ToastContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SiteProvider>
          <PlayerProvider>
            <SupportProvider>
              <App />
            </SupportProvider>
          </PlayerProvider>
        </SiteProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
