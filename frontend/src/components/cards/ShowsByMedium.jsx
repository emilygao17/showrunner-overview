import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import { BAR_PALETTE } from '../../utils/constants.js';

// Story-mode-only card (hidden in magazine via CSS): vertical bar chart of
// top 10 mediums by count, with bold count labels above each bar.
export default function ShowsByMedium({ onViewStats, label }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!onViewStats || !canvasRef.current) return;
    const sorted = [...onViewStats.medium].sort((a, b) => b.count - a.count).slice(0, 10);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: sorted.map(d => d.label),
        datasets: [{
          data: sorted.map(d => d.count),
          backgroundColor: sorted.map((_, i) => BAR_PALETTE[i % BAR_PALETTE.length]),
          borderWidth: 0,
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 26 } },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 13 }, color: '#555', maxRotation: 35, minRotation: 0 },
          },
          y: { display: false },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            formatter: value => value,
            font: { size: 12, weight: '700' },
            color: '#333',
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [onViewStats]);

  if (!onViewStats) return null;

  return (
    <div className="card card-full card-onview">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">{label} — shows by medium</div>
      <div className="onview-bar-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
