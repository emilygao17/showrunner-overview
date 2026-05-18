import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MONTH_SHORT } from '../../utils/constants.js';

// Same logic as the old initMap + applyView map-sync block:
//   * Mount: build map, layers, popup, hover/click handlers.
//   * Month change: tear down + rebuild (data and ym both change).
//   * View change (without month change): no rebuild — just resize, swap source
//     data (all checkins for story, week 0 for magazine), flip unclustered
//     visibility, and toggle interactions.
//   * Magazine week buttons: refresh source with that week's features.
//
// Persistence across view toggles is the load-bearing detail — that's why
// initialization is keyed on (ym), not on (ym, view).

function weekBounds(ym, week) {
  const [y, m] = ym.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const starts = [1, 8, 15, 22];
  const start = starts[week];
  const end = week === 3 ? daysInMonth : starts[week + 1] - 1;
  return { start, end };
}

function filterByWeek(checkins, ym, week) {
  const { start, end } = weekBounds(ym, week);
  return checkins.filter(c => {
    const day = parseInt(c.timestamp.slice(8, 10), 10);
    return day >= start && day <= end;
  });
}

function toFeatures(checkins) {
  return checkins
    .filter(c => c.lat && c.lon)
    .map(c => {
      const ts = c.timestamp.slice(0, 10);
      const [, mo, d] = ts.split('-');
      const dateLabel = `${MONTH_SHORT[mo]} ${parseInt(d, 10)}`;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
        properties: {
          show:  c.show_title,
          venue: c.venue_name,
          hood:  c.neighborhood,
          dateLabel,
        },
      };
    });
}

function buildTooltipHTML(items) {
  const rows = items.map(p =>
    `<div style="padding:4px 0;border-bottom:1px solid #eee;line-height:1.4">
      <strong style="display:block">${p.show}</strong>
      <span style="color:#444">${p.venue}</span>
      <span style="color:#999;float:right">${p.dateLabel}</span>
    </div>`
  ).join('');
  return `<div style="font:12px/1.4 Inter,sans-serif;color:#0A0A0A;max-height:200px;overflow-y:auto;width:220px;padding:2px 4px">${rows}</div>`;
}

export default function CheckInMap({ checkins, ym, view }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const popupRef     = useRef(null);
  const [week, setWeek] = useState(0);

  // Init / rebuild map when month changes. View changes do NOT trigger this.
  useEffect(() => {
    if (!containerRef.current || !checkins || !ym) return;
    const isStory = document.body.classList.contains('story-mode');

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: isStory ? [-73.990, 40.748] : [-73.990, 40.765],
      zoom:   isStory ? 11.5 : 10.8,
      attributionControl: false,
    });
    mapRef.current = map;

    if (isStory) {
      map.scrollZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();
      map.boxZoom.disable();
      map.dragPan.disable();
      map.keyboard.disable();
    }

    map.on('load', () => {
      const initFeatures = isStory
        ? toFeatures(checkins)
        : toFeatures(filterByWeek(checkins, ym, 0));

      map.addSource('checkins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: initFeatures },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 30,
        generateId: true,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'checkins',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0A0A0A',
          'circle-radius': ['step', ['get', 'point_count'], 12, 10, 18, 30, 24],
          'circle-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.85],
          'circle-opacity-transition': { duration: 180 },
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'checkins',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
        },
        paint: {
          'text-color': '#fff',
          'text-opacity': 1,
          'text-opacity-transition': { duration: 180 },
        },
      });

      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'checkins',
        filter: ['!', ['has', 'point_count']],
        layout: { visibility: isStory ? 'none' : 'visible' },
        paint: {
          'circle-color': '#0A0A0A',
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 7, 5],
          'circle-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.7],
          'circle-opacity-transition': { duration: 180 },
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
          'circle-stroke-opacity': 1,
          'circle-stroke-opacity-transition': { duration: 180 },
        },
      });

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 12,
        maxWidth: 'none',
      });
      popupRef.current = popup;

      // Hover highlight (no tooltip)
      let hoveredId = null;
      const setHover = (id, state) => map.setFeatureState({ source: 'checkins', id }, { hover: state });

      ['unclustered', 'clusters'].forEach(layer => {
        map.on('mouseenter', layer, e => {
          map.getCanvas().style.cursor = 'pointer';
          const id = e.features[0].id;
          if (hoveredId !== null && hoveredId !== id) setHover(hoveredId, false);
          hoveredId = id;
          setHover(id, true);
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
          if (hoveredId !== null) { setHover(hoveredId, false); hoveredId = null; }
        });
      });

      // Click to open pinned tooltip
      let clickedOnFeature = false;
      map.on('click', 'unclustered', e => {
        clickedOnFeature = true;
        const p = e.features[0].properties;
        popup.setLngLat(e.lngLat).setHTML(buildTooltipHTML([p])).addTo(map);
      });
      map.on('click', 'clusters', e => {
        clickedOnFeature = true;
        const feat = e.features[0];
        const clusterId = feat.properties.cluster_id;
        const count = feat.properties.point_count;
        Promise.resolve(
          map.getSource('checkins').getClusterLeaves(clusterId, count, 0)
        ).then(leaves => {
          const items = leaves.map(l => l.properties);
          popup.setLngLat(e.lngLat).setHTML(buildTooltipHTML(items)).addTo(map);
        }).catch(() => {});
      });
      map.on('click', () => {
        if (clickedOnFeature) { clickedOnFeature = false; return; }
        popup.remove();
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
  }, [checkins, ym]);

  // View change WITHOUT month change: matches the old applyView map-sync block.
  // Resize, re-project features for the new view, flip unclustered visibility,
  // and toggle interactions on/off.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !checkins || !ym) return;
    const isStory = view === 'story';

    map.resize();
    if (map.isStyleLoaded() && map.getSource('checkins')) {
      const features = isStory ? toFeatures(checkins) : toFeatures(filterByWeek(checkins, ym, week));
      map.getSource('checkins').setData({ type: 'FeatureCollection', features });
      map.setLayoutProperty('unclustered', 'visibility', isStory ? 'none' : 'visible');
    }

    const toggle = isStory ? 'disable' : 'enable';
    map.scrollZoom[toggle]();
    map.doubleClickZoom[toggle]();
    map.touchZoomRotate[toggle]();
    map.boxZoom[toggle]();
    map.dragPan[toggle]();
    map.keyboard[toggle]();
  }, [view, checkins, ym, week]);

  // Magazine week button click → set week and refresh source data with that
  // week's filtered checkins (mirrors switchWeek with the same 180ms fade).
  function selectWeek(w) {
    if (w === week) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setWeek(w);

    const FADE = 180;
    map.setPaintProperty('clusters',     'circle-opacity', 0);
    map.setPaintProperty('cluster-count', 'text-opacity', 0);
    map.setPaintProperty('unclustered',  'circle-opacity', 0);
    map.setPaintProperty('unclustered',  'circle-stroke-opacity', 0);
    setTimeout(() => {
      const features = toFeatures(filterByWeek(checkins, ym, w));
      map.getSource('checkins').setData({ type: 'FeatureCollection', features });
      map.setPaintProperty('clusters',     'circle-opacity', 0.85);
      map.setPaintProperty('cluster-count', 'text-opacity', 1);
      map.setPaintProperty('unclustered',  'circle-opacity', 0.7);
      map.setPaintProperty('unclustered',  'circle-stroke-opacity', 1);
    }, FADE);
  }

  return (
    <div className="card card-full">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">Check-in Map</div>
      <div className="week-nav" id="week-nav">
        {[0, 1, 2, 3].map(w => (
          <button
            key={w}
            type="button"
            className={`week-btn${w === week ? ' active' : ''}`}
            data-week={w}
            onClick={() => selectWeek(w)}
          >
            Week {w + 1}
          </button>
        ))}
      </div>
      <div id="map-container" ref={containerRef} />
    </div>
  );
}
