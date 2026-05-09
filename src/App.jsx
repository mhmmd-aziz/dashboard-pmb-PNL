import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { C, card, htitle } from './theme.js';
import Tip from './Tip.jsx';
import HBar from './HBar';
import MapIndonesia from './MapIndonesia';
import logoPNL from './assets/logopnl.png';

const shortJalur = (s) => s
  .replace('Seleksi Nasional Berdasarkan Berprestasi', 'SNBP')
  .replace('Seleksi Nasional Berbasis Tes', 'SNBT')
  .replace('Seleksi Mandiri Masuk Politeknik Negeri', 'SM-PNL')
  .replace('Penelusuran Prestasi Masuk Politeknik Negeri', 'PP-PNL')
  .replace('Adik Papua & 3T', 'Adik Papua');

export default function App() {
  const [allData, setAllData] = useState([]);
  const [selProdi, setSelProdi] = useState([]);
  const [selTahun, setSelTahun] = useState([]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'dashboard.csv').then(r => r.text()).then(csv => {
      Papa.parse(csv, {
        header: true, skipEmptyLines: true,
        transformHeader: h => h.trim(),
        complete: ({ data }) => {
          const clean = data.map(row => {
            const r = {};
            Object.keys(row).forEach(k => { r[k.trim()] = (row[k] || '').trim(); });
            return r;
          });
          setAllData(clean);
          setSelProdi([...new Set(clean.map(d => d['namaProdi']).filter(Boolean))]);
          setSelTahun([...new Set(clean.map(d => d['tahun masuk']).filter(Boolean))]);
        },
      });
    });
  }, []);

  const allProdi = useMemo(() => [...new Set(allData.map(d => d['namaProdi']).filter(Boolean))].sort(), [allData]);
  const allTahun = useMemo(() => [...new Set(allData.map(d => d['tahun masuk']).filter(Boolean))].sort(), [allData]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allData.filter(d => {
      const matchTahun = selTahun.includes(d['tahun masuk']);
      const matchProdi = selProdi.includes(d['namaProdi']);
      const matchSearch = q === '' || 
        (d['Nama'] && d['Nama'].toLowerCase().includes(q)) || 
        (d['NIM'] && d['NIM'].includes(q)) || 
        (d['Sekolah'] && d['Sekolah'].toLowerCase().includes(q));
      return matchTahun && matchProdi && matchSearch;
    });
  }, [allData, selTahun, selProdi, searchQuery]);

  const top = (key, n) => {
    const c = {};
    filtered.forEach(d => { const v = d[key]; if (v) c[v] = (c[v] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));
  };

  const top5School   = useMemo(() => top('Sekolah', 5), [filtered]);
  const top5Jurusan  = useMemo(() => top('Jurusan sekolah', 5), [filtered]);
  const top10Kec     = useMemo(() => top('Kecamatan', 10), [filtered]);
  const top10Kab     = useMemo(() => top('Kabupaten/ Kota', 10), [filtered]);
  const provinsiPie  = useMemo(() => top('Provinsi', 8), [filtered]);
  const prodiDonut   = useMemo(() => top('namaProdi', 10), [filtered]);

  const provinsiMap = useMemo(() => {
    const c = {};
    filtered.forEach(d => { const p = d['Provinsi']; if (p) c[p.toLowerCase()] = (c[p.toLowerCase()] || 0) + 1; });
    return c;
  }, [filtered]);

  // Per-tahun per-provinsi for map tooltip & grouped chart
  const provinsiPerTahun = useMemo(() => {
    const result = {};
    allTahun.forEach(t => {
      const c = {};
      filtered.filter(d => d['tahun masuk'] === t).forEach(d => {
        const p = d['Provinsi'];
        if (p) c[p.toLowerCase()] = (c[p.toLowerCase()] || 0) + 1;
      });
      result[t] = c;
    });
    return result;
  }, [filtered, allTahun]);

  // Top 8 provinces for grouped bar chart (3 years)
  const topProvGrouped = useMemo(() => {
    const totals = {};
    filtered.forEach(d => { const p = d['Provinsi']; if (p) totals[p.toLowerCase()] = (totals[p.toLowerCase()] || 0) + 1; });
    const top8 = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
    return top8.map(prov => {
      const row = { name: prov.charAt(0).toUpperCase() + prov.slice(1).replace('sumatera', 'Sumatra') };
      allTahun.forEach(t => { row[t] = (provinsiPerTahun[t] || {})[prov] || 0; });
      return row;
    });
  }, [filtered, allTahun, provinsiPerTahun]);

  const jalurData = useMemo(() => {
    const c = {};
    filtered.forEach(d => { const j = d['nmJalurMasuk']; if (j) c[j] = (c[j] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: shortJalur(name), value, full: name }));
  }, [filtered]);

  const lineData = useMemo(() =>
    allTahun.map(tahun => {
      const row = { tahun };
      allProdi.forEach(p => { if (selProdi.includes(p)) row[p] = filtered.filter(d => d['tahun masuk'] === tahun && d['namaProdi'] === p).length; });
      return row;
    }), [allTahun, allProdi, filtered, selProdi]);

  const kpis = [
    { label: 'Total Pendaftar',   value: filtered.length, color: '#3b82f6' },
    { label: 'Program Studi',     value: new Set(filtered.map(d => d['namaProdi']).filter(Boolean)).size, color: '#06b6d4' },
    { label: 'Kabupaten / Kota',  value: new Set(filtered.map(d => d['Kabupaten/ Kota']).filter(Boolean)).size, color: '#8b5cf6' },
    { label: 'Provinsi',          value: new Set(filtered.map(d => d['Provinsi']).filter(Boolean)).size, color: '#10b981' },
  ];

  const toggle = (arr, setArr, val) => setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#060b17', color: '#f8fafc', fontFamily: '"Inter",system-ui,sans-serif', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 230, background: '#070e1f', borderRight: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#0891b2)', padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logoPNL} alt="Logo PNL" style={{ width: 42, height: 42, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>PMB DASHBOARD</div>
            <div style={{ fontSize: 11, color: '#bae6fd', marginTop: 2 }}>Analisis Data Historis</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ padding: '14px 12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Dashboard', 'Data'].map((t) => {
              const isActive = activeTab === t;
              return (
                <div 
                  key={t} 
                  onClick={() => setActiveTab(t)}
                  style={{ 
                    background: isActive ? 'linear-gradient(90deg, #1e3a8a, transparent)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? '#38bdf8' : 'transparent'}`,
                    padding: '8px 12px', 
                    fontSize: 12, 
                    color: isActive ? '#f8fafc' : '#64748b', 
                    cursor: 'pointer', 
                    fontWeight: isActive ? 700 : 500,
                    transition: 'all 0.2s',
                    borderRadius: '0 6px 6px 0'
                  }}
                >
                  {t === 'Dashboard' ? '' : ''} {t}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '14px 12px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>Program Studi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allProdi.map(p => {
              const checked = selProdi.includes(p);
              return (
                <div key={p} onClick={() => toggle(selProdi, setSelProdi, p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    background: checked ? '#0f172a' : 'transparent',
                    border: `1px solid ${checked ? '#1d4ed8' : '#1e293b'}`,
                    borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: checked ? '#3b82f6' : '#1e293b', border: `1px solid ${checked ? '#60a5fa' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {checked && <div style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</div>}
                  </div>
                  <span style={{ fontSize: 10, color: checked ? '#f8fafc' : '#94a3b8', lineHeight: 1.4 }}>{p}</span>
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: '#1e293b', margin: '14px 0' }} />

          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>Tahun Masuk</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allTahun.map(t => {
              const checked = selTahun.includes(t);
              return (
                <div key={t} onClick={() => toggle(selTahun, setSelTahun, t)}
                  style={{
                    padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 6,
                    background: checked ? '#3b82f6' : '#1e293b',
                    color: checked ? '#fff' : '#94a3b8',
                    border: `1px solid ${checked ? '#60a5fa' : '#334155'}`,
                    transition: 'all 0.2s'
                  }}>
                  {t}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Header with Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 10, padding: '10px 18px' }}>
          <div style={{ fontWeight: 800, fontSize: 16, background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {activeTab === 'Dashboard' ? 'Visualisasi Data Historis PMB' : 'Data Mahasiswa Baru'}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '4px 12px', width: 300 }}>
            <input 
              type="text" 
              placeholder="Cari NIM, Nama, atau Sekolah..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 12, outline: 'none', width: '100%' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>✕</button>
            )}
          </div>
        </div>

        {/* TAB CONTENT: DASHBOARD */}
        {activeTab === 'Dashboard' && (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {kpis.map(({ label, value, color }) => (
                <div key={label} style={{ ...card, borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 38, fontWeight: 900, color, lineHeight: 1 }}>{value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* ROW 2: Top 5 Sekolah | Top 5 Jurusan | Top 10 Kec | Provinsi Pie */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 220px', gap: 10 }}>
              <div style={card}>
                <div style={htitle}>Top 5 Asal Sekolah</div>
                <HBar data={top5School} color="#3b82f6" />
              </div>
              <div style={card}>
                <div style={htitle}>Top 5 Jurusan Sekolah</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={top5Jurusan} margin={{ top: 4, right: 4, left: -24, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#64748b', fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {top5Jurusan.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <div style={htitle}>Top 10 Kecamatan</div>
                <HBar data={top10Kec} color="#8b5cf6" />
              </div>
              <div style={card}>
                <div style={htitle}>Sebaran Provinsi</div>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={provinsiPie} dataKey="value" innerRadius={32} outerRadius={50} stroke="none" paddingAngle={3}>
                      {provinsiPie.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                {provinsiPie.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: C[i % C.length], flexShrink: 0, marginTop: 3 }} />
                    <span title={p.name} style={{ fontSize: 9, color: '#94a3b8', flex: 1, lineHeight: 1.2 }}>{p.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#f8fafc', flexShrink: 0 }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 3: Line | Jalur Masuk | Top 10 Kab */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={card}>
                <div style={htitle}>Tren Pendaftaran per Program Studi</div>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={lineData} margin={{ top: 5, right: 10, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="tahun" stroke="#334155" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip content={<Tip />} />
                    <Legend wrapperStyle={{ fontSize: 9, color: '#64748b' }} />
                    {selProdi.map((p, i) => <Line key={p} type="monotone" dataKey={p} stroke={C[i % C.length]} strokeWidth={2} dot={{ r: 3 }} name={p} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <div style={htitle}>Sebaran Jalur Masuk</div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={jalurData} margin={{ top: 4, right: 4, left: -24, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#64748b', fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px', borderRadius: 6, fontSize: 11 }}>
                          <div style={{ color: '#94a3b8', marginBottom: 2, maxWidth: 200, wordBreak: 'break-word' }}>{payload[0].payload.full}</div>
                          <div style={{ color: '#fff', fontWeight: 700 }}>{payload[0].value}</div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {jalurData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <div style={htitle}>Top 10 Kabupaten / Kota</div>
                <HBar data={top10Kab} color="#06b6d4" />
              </div>
            </div>

            {/* ROW 4: Peta Indonesia + Donut Prodi */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 10 }}>
              <div style={{ ...card, height: 280 }}>
                <div style={htitle}>Peta Sebaran Pendaftar per Provinsi </div>
                <div style={{ height: 240, position: 'relative' }}>
                  <MapIndonesia provinsiMap={provinsiMap} provinsiPerTahun={provinsiPerTahun} allTahun={allTahun} />
                </div>
              </div>
              <div style={card}>
                <div style={htitle}>Proporsi per Program Studi</div>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={prodiDonut} dataKey="value" innerRadius={40} outerRadius={60} stroke="none" paddingAngle={3}>
                      {prodiDonut.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6, overflowY: 'auto', maxHeight: 100 }}>
                  {prodiDonut.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: C[i % C.length], flexShrink: 0, marginTop: 3 }} />
                      <span title={p.name} style={{ fontSize: 10, color: '#94a3b8', flex: 1, lineHeight: 1.2 }}>{p.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 1 }}>{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ROW 5: Top Provinsi per Tahun - Grouped Bar */}
            <div style={card}>
              <div style={htitle}>Sebaran Top Provinsi Pendaftar per Tahun</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProvGrouped} margin={{ top: 5, right: 10, left: -20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#64748b', fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
                  <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#64748b', paddingTop: 8 }} />
                  {allTahun.map((t, i) => (
                    <Bar key={t} dataKey={t} name={`Tahun ${t}`} fill={C[i % C.length]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* TAB CONTENT: DATA TABLE */}
        {activeTab === 'Data' && (
          <div style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e3a5f', background: '#0f172a' }}>
              <div style={htitle}>Tabel Data Mahasiswa Baru</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Menampilkan {filtered.length.toLocaleString()} data pendaftar yang cocok dengan filter.</div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', color: '#94a3b8', zIndex: 10, textAlign: 'left' }}>
                  <tr>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #334155' }}>NIM</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #334155' }}>Nama</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #334155' }}>Program Studi</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #334155' }}>Sekolah Asal</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #334155' }}>Kab/Kota</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #334155' }}>Provinsi</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #334155' }}>Jalur Masuk</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #334155' }}>Tahun</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b', background: idx % 2 === 0 ? 'transparent' : '#0a101d' }}>
                      <td style={{ padding: '10px 20px', color: '#94a3b8' }}>{item['NIM'] || '-'}</td>
                      <td style={{ padding: '10px 20px', color: '#f8fafc', fontWeight: 600 }}>{item['Nama'] || '-'}</td>
                      <td style={{ padding: '10px 20px', color: '#38bdf8' }}>{item['namaProdi'] || '-'}</td>
                      <td style={{ padding: '10px 20px', color: '#cbd5e1' }}>{item['Sekolah'] || '-'}</td>
                      <td style={{ padding: '10px 20px', color: '#94a3b8' }}>{item['Kabupaten/ Kota'] || '-'}</td>
                      <td style={{ padding: '10px 20px', color: '#94a3b8' }}>{item['Provinsi'] || '-'}</td>
                      <td style={{ padding: '10px 20px', color: '#94a3b8' }}>{shortJalur(item['nmJalurMasuk'] || '-')}</td>
                      <td style={{ padding: '10px 20px', color: '#94a3b8' }}>{item['tahun masuk'] || '-'}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada data yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 500 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #1e3a5f', background: '#0f172a', textAlign: 'center', fontSize: 10, color: '#64748b' }}>
                Hanya menampilkan 500 data pertama untuk menjaga performa tabel. Silakan perketat filter untuk melihat data lebih spesifik.
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
