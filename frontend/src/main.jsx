import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import App from './App.jsx';
import './styles/global.css';

// CDN Chart.js auto-registers everything; the npm build is modular, so we
// have to register the standard controllers/scales/etc. once at startup,
// plus the datalabels plugin used by the on-view bar chart.
Chart.register(...registerables, ChartDataLabels);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
