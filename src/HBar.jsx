import React from 'react';
import { C } from './theme.js';


export default function HBar({ data, color }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            title={d.name}
            style={{
              width: 120,
              fontSize: 10,
              color: '#94a3b8',
              textAlign: 'right',
              lineHeight: 1.2,
              wordBreak: 'break-word',
              flexShrink: 0,
            }}
          >{d.name}</div>
          <div style={{ flex: 1, background: '#1e293b', borderRadius: 3, height: 16 }}>
            <div style={{
              width: `${(d.value / max) * 100}%`,
              background: color || C[i % C.length],
              borderRadius: 3,
              height: '100%',
              minWidth: 4,
              transition: 'width .3s',
            }} />
          </div>
          <div style={{ width: 26, fontSize: 10, color: '#f8fafc', fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
            {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}
