import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import Table from '../components/Table';
import { Heart, Activity, AlertCircle, Plus, Calendar, Trash2 } from 'lucide-react';

const Metrics = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('Heart Rate');

  // Input states
  const [form, setForm] = useState({
    type: 'Heart Rate',
    value: '',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchMetrics = async () => {
    try {
      const data = await api.get('/metrics');
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await fetchMetrics();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const getUnit = (type) => {
    switch (type) {
      case 'Blood Pressure (Systolic)':
        return 'mmHg';
      case 'Blood Sugar':
        return 'mg/dL';
      case 'Heart Rate':
        return 'bpm';
      case 'Weight':
        return 'kg';
      default:
        return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setForm({ ...form, type: value, value: '' });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.value || isNaN(form.value)) {
      alert('Please enter a valid numeric value');
      return;
    }

    try {
      await api.post('/metrics', {
        type: form.type,
        value: Number(form.value),
        unit: getUnit(form.type),
        date: form.date,
      });

      // Reset form and reload
      setForm({
        ...form,
        value: '',
        date: new Date().toISOString().split('T')[0],
      });
      await fetchMetrics();
      alert('Metric logged successfully!');
    } catch (err) {
      alert(err.message || 'Failed to log metric');
    }
  };

  // SVG Chart Renderer
  const renderSVGChart = (type) => {
    const filtered = metrics.filter((m) => m.type === type);
    if (filtered.length < 2) {
      return (
        <div style={{
          height: '220px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          border: '1px dashed var(--glass-border)',
          borderRadius: 'var(--border-radius)',
          backgroundColor: 'rgba(15, 23, 42, 0.2)',
          fontSize: '0.9rem',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <AlertCircle size={20} />
          <span>Add at least 2 data points of "{type}" to draw the trend line.</span>
        </div>
      );
    }

    // Chart Dimensions
    const width = 640;
    const height = 220;
    const paddingX = 40;
    const paddingY = 30;

    const values = filtered.map((m) => m.value);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const valRange = maxVal - minVal === 0 ? 20 : maxVal - minVal;

    // Pad range slightly for aesthetic spacing
    const yMax = maxVal + valRange * 0.15;
    const yMin = Math.max(0, minVal - valRange * 0.15);
    const yRange = yMax - yMin;

    const points = filtered.map((m, idx) => {
      const x = paddingX + (idx * (width - 2 * paddingX)) / (filtered.length - 1);
      const y = height - paddingY - ((m.value - yMin) * (height - 2 * paddingY)) / yRange;
      return { x, y, value: m.value, date: new Date(m.date).toLocaleDateString() };
    });

    // Construct path string
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Area path for gradient fill
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
      <div style={{ position: 'relative', background: 'var(--glass-bg)', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--accent-teal)' }}>
          {type} Trend Chart ({getUnit(type)})
        </h3>
        
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.05)" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="rgba(255,255,255,0.05)" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.1)" />

          {/* Area under the curve */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line path */}
          <path d={pathD} fill="none" stroke="var(--accent-teal)" strokeWidth="3" strokeLinecap="round" />

          {/* Points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-secondary)" stroke="var(--accent-teal)" strokeWidth="2" style={{ cursor: 'pointer' }} />
              {/* Text label above point */}
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="600">
                {p.value}
              </text>
              {/* X Axis Date Label */}
              {idx === 0 || idx === points.length - 1 || points.length <= 5 ? (
                <text x={p.x} y={height - 10} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">
                  {p.date}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Health Tracker...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Health Tracker</h1>
          <p className="page-subtitle">Log and monitor vital physical health parameters</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '1.5rem' }}>
        
        {/* Left column: Add new log */}
        <div>
          <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--glass-border)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} />
              <span>Log Vitals</span>
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Metric Type *</label>
                <select name="type" className="form-select" value={form.type} onChange={handleInputChange}>
                  <option value="Heart Rate">Heart Rate (bpm)</option>
                  <option value="Blood Sugar">Blood Sugar (mg/dL)</option>
                  <option value="Blood Pressure (Systolic)">Blood Pressure (mmHg - Systolic)</option>
                  <option value="Weight">Weight (kg)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Value ({getUnit(form.type)}) *</label>
                <input
                  type="number"
                  name="value"
                  className="form-input"
                  placeholder={`Enter value (e.g. ${form.type === 'Heart Rate' ? '72' : form.type === 'Weight' ? '65' : '120'})`}
                  value={form.value}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  name="date"
                  className="form-input"
                  value={form.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <button type="submit" className="btn btn-teal btn-full" style={{ marginTop: '0.5rem' }}>
                Save Log Entry
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Trends and history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Trend Chart Selection */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--glass-border)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>View Chart:</span>
            {['Heart Rate', 'Blood Sugar', 'Blood Pressure (Systolic)', 'Weight'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`btn btn-sm ${selectedType === t ? 'btn-teal' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* SVG Line Chart */}
          {renderSVGChart(selectedType)}

          {/* Logs History Table */}
          <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Recent Vital Logs
            </h3>

            {metrics.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No vital stats recorded yet.</p>
            ) : (
              <Table headers={['Date', 'Type', 'Value', 'Unit']}>
                {[...metrics].reverse().slice(0, 10).map((m) => (
                  <tr key={m._id}>
                    <td>{new Date(m.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{m.type}</td>
                    <td style={{ fontWeight: 700 }}>{m.value}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{m.unit}</td>
                  </tr>
                ))}
              </Table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Metrics;
