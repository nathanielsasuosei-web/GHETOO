import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SiteProvider } from './context/SiteContext';
import { FanProvider } from './context/FanContext';
import { PlayerProvider } from './context/PlayerContext';
import { SupportProvider } from './context/SupportContext';
import { ToastProvider } from './context/ToastContext';
import './styles.css';
import './styles-v12.css';
import './styles-liquid.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SiteProvider>
          <FanProvider>
            <PlayerProvider>
              <SupportProvider>
                <App />
              </SupportProvider>
            </PlayerProvider>
          </FanProvider>
        </SiteProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
