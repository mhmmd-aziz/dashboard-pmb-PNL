import React from 'react';
import { C } from './theme.js';

export default function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px 12px', borderRadius: 8, fontSize: 12, maxWidth: 220 }}>
      {label && <div style={{ color: '#94a3b8', marginBottom: 4, wordBreak: 'break-word' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: '#f8fafc', fontWeight: 600 }}>
          {p.name && p.name !== 'value' ? <span style={{ color: '#94a3b8' }}>{p.name}: </span> : null}
          <span style={{ color: C[i % C.length] }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}
