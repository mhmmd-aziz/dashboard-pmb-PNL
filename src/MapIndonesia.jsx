import React, { useState, useEffect, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const GEO_URL = 'https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province-simple.json';
const W = 700, H = 300;

const projection = geoMercator().center([118, -2]).scale(820).translate([W / 2, H / 2]);
const pathGen = geoPath().projection(projection);

const getColor = (count, max) => {
  if (!count || !max) return '#1e293b';
  const t = Math.min(count / max, 1);
  // Deep blue to cyan gradient
  const r = Math.round(15 + t * 14);
  const g = Math.round(23 + t * (186 - 23));
  const b = Math.round(42 + t * (212 - 42));
  return `rgb(${r},${g},${b})`;
};

export default function MapIndonesia({ provinsiMap, provinsiPerTahun, allTahun }) {
  const [geo, setGeo] = useState(null);
  const [tip, setTip] = useState(null);
  const [hoveredProv, setHoveredProv] = useState(null);

  useEffect(() => {
    fetch(GEO_URL)
      .then(r => r.json())
      .then(setGeo)
      .catch(err => console.error('GeoJSON load error:', err));
  }, []);

  const max = Math.max(...Object.values(provinsiMap), 1);

  const handleEnter = useCallback((e, name, count) => {
    setHoveredProv(name);
    setTip({ name, count, x: e.clientX, y: e.clientY });
  }, []);

  const handleMove = useCallback((e) => {
    setTip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredProv(null);
    setTip(null);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!geo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: 12 }}>
          Memuat peta...
        </div>
      )}
      {geo && (
        <TransformWrapper initialScale={1} minScale={0.5} maxScale={8} wheel={{ step: 0.1 }}>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom Controls */}
              <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
                <button onClick={() => zoomIn()} style={{ width: 24, height: 24, background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                <button onClick={() => zoomOut()} style={{ width: 24, height: 24, background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                <button onClick={() => resetTransform()} style={{ width: 24, height: 24, background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>↺</button>
              </div>
              
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                >
                  {geo.features.map((feature, i) => {
                    const rawName = feature.properties.Propinsi || feature.properties.state || feature.properties.name || feature.properties.NAME || '';
                    let key = rawName.toLowerCase();
                    if (key === 'di. aceh') key = 'aceh';
                    if (key === 'probanten') key = 'banten';
                    if (key === 'daerah istimewa yogyakarta') key = 'di yogyakarta'; // fallback
                    
                    const count = provinsiMap[key] || 0;
                    const isHovered = hoveredProv === key;
                    const fill = isHovered ? '#38bdf8' : getColor(count, max);
                    const d = pathGen(feature);
                    if (!d) return null;
                    return (
                      <path
                        key={i}
                        d={d}
                        fill={fill}
                        stroke="#060b17"
                        strokeWidth={0.6}
                        style={{ cursor: 'pointer', transition: 'fill .15s' }}
                        onMouseEnter={(e) => handleEnter(e, key, count)}
                        onMouseMove={handleMove}
                        onMouseLeave={handleLeave}
                      />
                    );
                  })}
                </svg>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      )}

      {/* Color Legend */}
      {geo && (
        <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#475569' }}>0</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
            <div key={t} style={{
              width: 16, height: 10, borderRadius: 2,
              background: `rgb(${Math.round(15 + t * 14)},${Math.round(23 + t * 163)},${Math.round(42 + t * 170)})`,
            }} />
          ))}
          <span style={{ fontSize: 9, color: '#38bdf8' }}>{max}</span>
        </div>
      )}

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'fixed', top: tip.y - 58, left: tip.x + 12,
          background: '#0f172a', border: '1px solid #1e3a5f',
          borderRadius: 8, padding: '8px 12px', fontSize: 11,
          pointerEvents: 'none', zIndex: 9999, minWidth: 140,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: 4, textTransform: 'capitalize' }}>{tip.name}</div>
          <div style={{ color: '#f8fafc' }}>Total: <strong style={{ color: '#06b6d4' }}>{tip.count}</strong></div>
          {allTahun && provinsiPerTahun && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {allTahun.map(t => (
                <div key={t} style={{ color: '#64748b', fontSize: 10 }}>
                  {t}: <span style={{ color: '#94a3b8' }}>{(provinsiPerTahun[t] || {})[tip.name] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
