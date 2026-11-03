import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SiteProvider } from './context/SiteContext';
import { PlayerProvider } from './context/PlayerContext';
import { SupportProvider } from './context/SupportContext';
import { ToastProvider } from './context/ToastContext';
import { FanProvider } from './context/FanContext';
import './styles.css';
import './styles-v12.css';
import './styles-features.css';
import './styles-liquidglass.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <FanProvider>
          <SiteProvider>
            <PlayerProvider>
              <SupportProvider>
                <App />
              </SupportProvider>
            </PlayerProvider>
          </SiteProvider>
        </FanProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
