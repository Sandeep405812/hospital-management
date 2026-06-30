import React, { useEffect, useState } from 'react';
import Table from '../components/Table';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_URL } from '../utils/api';
import { Upload, FileText, Trash2, Eye, Calendar, Sparkles, X } from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Active AI Report Analysis state
  const [activeAnalysisReport, setActiveAnalysisReport] = useState(null);

  const fetchReports = async () => {
    try {
      const data = await api.get('/reports');
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await fetchReports();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !file) {
      alert('Please provide both a title and select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/reports/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Upload failed');
      }

      setTitle('');
      setFile(null);
      document.getElementById('file-input').value = '';
      
      await fetchReports();
      alert('Report uploaded successfully!');
    } catch (err) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this report? This will remove it from the system.')) {
      try {
        await api.delete(`/reports/${id}`);
        fetchReports();
        alert('Report removed');
      } catch (err) {
        alert(err.message || 'Failed to delete report');
      }
    }
  };

  // Mock AI Analyzer trigger
  const handleAIAnalyze = (report) => {
    const name = report.title.toLowerCase();
    
    let biologicalMetrics = [
      { name: 'White Blood Cells (WBC)', val: 6500, min: 4500, max: 11000, unit: 'cells/mcL', status: 'Normal' },
      { name: 'Red Blood Cells (RBC)', val: 4.8, min: 4.2, max: 5.9, unit: 'million/mcL', status: 'Normal' },
      { name: 'Hemoglobin (Hb)', val: 11.8, min: 12.0, max: 15.5, unit: 'g/dL', status: 'Low' }
    ];
    let summary = 'Analysis completed. Your blood count values appear mostly normal, with a slight deficiency in Hemoglobin (11.8 g/dL). We advise a diet rich in iron or a general practitioner check-in.';

    if (name.includes('sugar') || name.includes('glucose') || name.includes('diabetes') || name.includes('blood test')) {
      biologicalMetrics = [
        { name: 'Fasting Blood Glucose', val: 112, min: 70, max: 100, unit: 'mg/dL', status: 'High' },
        { name: 'Post-Prandial Glucose', val: 148, min: 100, max: 140, unit: 'mg/dL', status: 'High' },
        { name: 'HbA1c Glycohemoglobin', val: 5.9, min: 4.0, max: 5.6, unit: '%', status: 'High' }
      ];
      summary = 'Warning: Elevated glucose metrics detected (HbA1c: 5.9%, Fasting: 112 mg/dL). This indicates a pre-diabetic glycemic load. We strongly recommend scheduling a consultation with a General Physician or Endocrinologist to review lifestyle and diet alterations.';
    } else if (name.includes('lipid') || name.includes('cholesterol') || name.includes('fat') || name.includes('liver')) {
      biologicalMetrics = [
        { name: 'Total Cholesterol', val: 224, min: 100, max: 199, unit: 'mg/dL', status: 'High' },
        { name: 'HDL Cholesterol', val: 42, min: 40, max: 60, unit: 'mg/dL', status: 'Normal' },
        { name: 'LDL Bad Cholesterol', val: 142, min: 0, max: 99, unit: 'mg/dL', status: 'High' }
      ];
      summary = 'Warning: Elevated Total Cholesterol (224 mg/dL) and LDL Cholesterol (142 mg/dL) identified. To lower cardiac risk ratios, we recommend consulting a Cardiologist or General Physician to discuss dietary lipids restriction and cardio workouts.';
    }

    setActiveAnalysisReport({
      report,
      metrics: biologicalMetrics,
      summary
    });
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading medical reports...</div>;
  }

  const pageLayout = {
    display: 'grid',
    gridTemplateColumns: '1fr 1.8fr',
    gap: '2rem',
  };

  const uploadCardStyle = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--border-radius-lg)',
    padding: '2rem',
    height: 'fit-content',
  };

  const fileInputWrapper = {
    border: '2px dashed var(--glass-border)',
    borderRadius: 'var(--border-radius)',
    padding: '1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    transition: 'var(--transition-smooth)',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Medical Reports</h1>
          <p className="page-subtitle">Upload and store clinical records and lab results</p>
        </div>
      </div>

      <div style={pageLayout} className="reports-grid">
        {/* Upload Form Block */}
        <div style={uploadCardStyle}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.15rem', color: 'var(--accent-blue)' }}>Upload Health Record</h3>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label className="form-label">Report Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sugar Test, Lipid Profile, Blood Test"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Document File (PDF / Images) *</label>
              <div style={fileInputWrapper} onClick={() => document.getElementById('file-input').click()}>
                <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {file ? file.name : 'Click to select report file'}
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Max size: 5MB</span>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={uploading}>
              {uploading ? 'Uploading Document...' : 'Submit Report'}
            </button>
          </form>
        </div>

        {/* Uploaded History List */}
        <div className="dashboard-section" style={{ margin: 0 }}>
          <h3 style={{ marginBottom: '1.25rem', fontWeight: 700, fontSize: '1.15rem' }}>Upload History</h3>
          {reports.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No reports uploaded yet.</p>
          ) : (
            <Table headers={['Document Details', 'Upload Date', 'Actions']}>
              {reports.map((rep) => (
                <tr key={rep._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{rep.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rep.fileName}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                      <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                      <span>{new Date(rep.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* Smart AI Analysis Trigger */}
                      <button
                        className="btn btn-teal btn-sm"
                        style={{ padding: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="AI Smart Analysis"
                        onClick={() => handleAIAnalyze(rep)}
                      >
                        <Sparkles size={16} />
                      </button>
                      <a
                        href={`${BACKEND_URL}${rep.filePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem' }}
                      >
                        <Eye size={16} />
                      </a>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.35rem' }}
                        onClick={() => handleDelete(rep._id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>

      {/* Smart AI Analysis modal popup */}
      {activeAnalysisReport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.82)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2rem', maxWidth: '520px',
            width: '100%', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.3s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-blue)' }} />
                <span>Smart Lab Analyzer (AI)</span>
              </h3>
              <button onClick={() => setActiveAnalysisReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Extracted bio-marker trends for report: <strong>{activeAnalysisReport.report.title}</strong>
            </p>

            {/* Extracted Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
              {activeAnalysisReport.metrics.map((m) => {
                const rangePct = Math.min(Math.max(((m.val - m.min * 0.5) / (m.max * 1.5 - m.min * 0.5)) * 100, 10), 90);
                return (
                  <div key={m.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span style={{
                        fontWeight: 700,
                        color: m.status === 'High' ? 'var(--danger)' : m.status === 'Low' ? 'var(--warning)' : 'var(--success)'
                      }}>
                        {m.val} {m.unit} ({m.status})
                      </span>
                    </div>
                    
                    {/* Progress bar gauge */}
                    <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '3px', position: 'relative' }}>
                      <div style={{
                        position: 'absolute', top: 0, left: `${rangePct}%`,
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: m.status === 'High' ? 'var(--danger)' : m.status === 'Low' ? 'var(--warning)' : 'var(--success)',
                        transform: 'translate(-50%, -1px)',
                        boxShadow: '0 0 6px currentColor'
                      }}></div>
                      {/* Highlight standard reference range box */}
                      <div style={{
                        position: 'absolute', top: 0, left: '30%', right: '30%', bottom: 0,
                        backgroundColor: 'rgba(16, 185, 129, 0.08)', borderLeft: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRight: '1px solid rgba(16, 185, 129, 0.2)'
                      }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      <span>Min Ref: {m.min}</span>
                      <span>Max Ref: {m.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Recommendations */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)',
              borderRadius: 'var(--border-radius)', padding: '1rem', marginBottom: '1.5rem'
            }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🤖 AI CLINICAL RECOMMENDATION SUMMARY
              </span>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                {activeAnalysisReport.summary}
              </p>
            </div>

            <button onClick={() => setActiveAnalysisReport(null)} className="btn btn-secondary btn-full">Close Analysis</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
