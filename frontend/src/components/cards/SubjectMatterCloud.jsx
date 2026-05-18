import { useEffect, useRef, useState } from 'react';
import { hierarchy, pack } from 'd3-hierarchy';
import { BAR_PALETTE } from '../../utils/constants.js';

// Story-only packed bubble cloud of the top 20 subject matters by show count.
// Data comes from data.on_view_stats.subject — already counted server-side
// (NYC venues, active during the month, one increment per subject per show).
// We just take the top 20 and run d3.pack inside a square SVG.
//
// Bubble area is proportional to count (the default d3.pack behavior); the
// d3 layout naturally produces square-root-scaled radii from the area sums,
// which keeps the smallest of the 20 bubbles legible at typical card sizes.
//
// Labels appear inside bubbles only when the radius and the estimated text
// width allow it; the rest get a native SVG <title> tooltip on hover.

const MAX_BUBBLES = 20;
const MIN_FONT    = 8;
const MAX_FONT    = 14;
const CHAR_W      = 0.55; // approximate Inter char-width / font-size ratio
const LINE_H      = 1.1;  // line-height multiplier
const PADDING     = 0.92; // shrink available width inside the circle a touch

// Returns { lines, fontSize, lineHeight } — the largest font size at which
// `label` fits inside a circle of radius r, allowing up to 3 lines of wrapping
// (split at the most balanced word boundary). Returns null if even the smallest
// font with 3 lines can't fit (extremely rare for the data we have).
function fitLabel(label, r) {
  const words  = label.split(/\s+/);
  const splits = [[label]];

  if (words.length >= 2) {
    let best = null, bestBalance = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const bal = Math.abs(a.length - b.length);
      if (bal < bestBalance) { bestBalance = bal; best = [a, b]; }
    }
    if (best) splits.push(best);
  }
  if (words.length >= 3) {
    const third = Math.ceil(words.length / 3);
    splits.push([
      words.slice(0, third).join(' '),
      words.slice(third, 2 * third).join(' '),
      words.slice(2 * third).join(' '),
    ]);
  }

  function fits(lines, fs) {
    const lh = fs * LINE_H;
    const n  = lines.length;
    for (let i = 0; i < n; i++) {
      const y    = (i - (n - 1) / 2) * lh;
      const maxW = 2 * Math.sqrt(Math.max(0, r * r - y * y)) * PADDING;
      const w    = lines[i].length * fs * CHAR_W;
      if (w > maxW) return false;
    }
    return true;
  }

  let best = null;
  for (const lines of splits) {
    for (let fs = MAX_FONT; fs >= MIN_FONT; fs -= 0.5) {
      if (fits(lines, fs)) {
        if (!best || fs > best.fontSize ||
            (fs === best.fontSize && lines.length < best.lines.length)) {
          best = { lines, fontSize: fs, lineHeight: fs * LINE_H };
        }
        break;
      }
    }
  }
  return best;
}

export default function SubjectMatterCloud({ onViewStats, label }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Re-measure the container so the SVG fills it as the card resizes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!onViewStats?.subject?.length) return null;

  const top = [...onViewStats.subject]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_BUBBLES);

  // Pack into a square — bubble diameter caps at min(width, height).
  const diameter = Math.max(0, Math.min(size.w, size.h));
  let nodes = [];
  if (diameter > 0) {
    const root = hierarchy({ children: top }).sum(d => d.count);
    pack().size([diameter, diameter]).padding(4)(root);
    nodes = root.leaves();
  }

  // Center the packed square inside the container if the container isn't square.
  const offsetX = (size.w - diameter) / 2;
  const offsetY = (size.h - diameter) / 2;

  return (
    <div className="card card-full card-subject-cloud">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">{label} — subject matter cloud</div>
      <div className="cloud-container" ref={containerRef}>
        {diameter > 0 && (
          <svg width={size.w} height={size.h} style={{ display: 'block' }}>
            <g transform={`translate(${offsetX},${offsetY})`}>
              {nodes.map((leaf, i) => {
                const color  = BAR_PALETTE[i % BAR_PALETTE.length];
                const layout = fitLabel(leaf.data.label, leaf.r);
                return (
                  <g key={leaf.data.label} transform={`translate(${leaf.x},${leaf.y})`}>
                    <title>{leaf.data.label}: {leaf.data.count} show{leaf.data.count === 1 ? '' : 's'}</title>
                    <circle r={leaf.r} fill={color} />
                    {layout && (
                      <text
                        textAnchor="middle"
                        style={{
                          fontSize: layout.fontSize,
                          fontWeight: 600,
                          fill: '#1a1a1a',
                          pointerEvents: 'none',
                          fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                      >
                        {layout.lines.map((line, li) => {
                          const y = (li - (layout.lines.length - 1) / 2) * layout.lineHeight;
                          return (
                            <tspan key={li} x="0" y={y} dy="0.35em">{line}</tspan>
                          );
                        })}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
