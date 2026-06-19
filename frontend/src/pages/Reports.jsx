import React, { useEffect, useState } from 'react';
import Table from '../components/Table';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_URL } from '../utils/api';
import { Upload, FileText, Trash2, Eye, Calendar } from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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
      // Reset input element
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

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading medical reports...</div>;
  }

  // Styles
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
                placeholder="e.g. Blood Test Report, Chest X-Ray"
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
    </div>
  );
};

export default Reports;
