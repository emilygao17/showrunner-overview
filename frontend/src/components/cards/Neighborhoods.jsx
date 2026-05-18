import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import { BAR_PALETTE } from '../../utils/constants.js';

// Bar list (visible in both views) + pie chart with legend (story-mode only,
// hidden via CSS in magazine). Bar colors match pie slice colors 1:1.
export default function Neighborhoods({ hoods }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!hoods || !hoods.length || !canvasRef.current) return;
    const colors = hoods.map((_, i) => BAR_PALETTE[i % BAR_PALETTE.length]);
    const total  = hoods.reduce((s, h) => s + h.checkin_count, 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'pie',
      data: {
        labels: hoods.map(h => h.neighborhood),
        datasets: [{
          data: hoods.map(h => h.checkin_count),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#faf9f7',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / total * 100)}%)`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [hoods]);

  if (!hoods || !hoods.length) return null;
  const max = hoods[0].checkin_count;
  const colors = hoods.map((_, i) => BAR_PALETTE[i % BAR_PALETTE.length]);

  return (
    <div className="card card-half">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">Neighborhoods</div>
      <div className="hood-pie-section">
        <div className="hood-pie-wrap">
          <canvas ref={canvasRef} />
        </div>
        <div className="hood-legend">
          {hoods.map((h, i) => (
            <div className="hood-legend-item" key={h.neighborhood}>
              <span className="hood-legend-swatch" style={{ background: colors[i] }} />
              <span className="hood-legend-name">{h.neighborhood}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hood-list">
        {hoods.map((h, i) => (
          <div className="hood-row" key={h.neighborhood}>
            <div className="hood-name">{h.neighborhood}</div>
            <div className="hood-bar-wrap">
              <div
                className="hood-bar"
                style={{
                  width: `${Math.round(h.checkin_count / max * 100)}%`,
                  background: colors[i],
                }}
              />
            </div>
            <div className="hood-count">
              {h.checkin_count}{' '}
              <span style={{ fontWeight: 400, fontSize: '0.8em', color: 'var(--muted)' }}>visits</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
