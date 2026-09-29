import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PerformanceOverlay } from './performance/PerformanceOverlay';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PerformanceOverlay />
    <App />
  </StrictMode>,
);
