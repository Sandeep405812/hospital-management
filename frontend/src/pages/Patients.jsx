import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_URL } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Mail, Phone, Eye, Edit, Calendar, FolderOpen } from 'lucide-react';

const Patients = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Edit History Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    allergies: '',
    medicalHistory: '',
  });

  // Patient Reports Modal State
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [patientReports, setPatientReports] = useState([]);

  const fetchPatients = async () => {
    try {
      const data = await api.get('/patients');
      setPatients(data);
    } catch (error) {
      console.error('Failed to fetch patients list:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await fetchPatients();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleOpenDetails = (patient) => {
    setSelectedPatient(patient);
    setIsDetailModalOpen(true);
  };

  const handleOpenEdit = (patient) => {
    setSelectedPatient(patient);
    setEditForm({
      allergies: patient.allergies?.join(', ') || '',
      medicalHistory: patient.medicalHistory?.join(', ') || '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenReports = async (patient) => {
    setSelectedPatient(patient);
    try {
      const reports = await api.get(`/reports?patientId=${patient._id}`);
      setPatientReports(reports);
      setIsReportsModalOpen(true);
    } catch (error) {
      alert(error.message || 'Failed to load patient reports');
    }
  };

  const handleSaveHistory = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        allergies: editForm.allergies.split(',').map((x) => x.trim()).filter(Boolean),
        medicalHistory: editForm.medicalHistory.split(',').map((x) => x.trim()).filter(Boolean),
      };

      await api.put(`/patients/${selectedPatient._id}`, payload);
      setIsEditModalOpen(false);
      setSelectedPatient(null);
      fetchPatients();
      alert('Patient records updated successfully!');
    } catch (error) {
      alert(error.message || 'Update failed');
    }
  };

  const filteredPatients = patients.filter((pat) => {
    const name = pat.user?.name || '';
    const email = pat.user?.email || '';
    const bloodType = pat.bloodType || '';
    const phone = pat.user?.phoneNumber || '';
    
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           email.toLowerCase().includes(searchQuery.toLowerCase()) ||
           bloodType.toLowerCase().includes(searchQuery.toLowerCase()) ||
           phone.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading patients registry...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">View and update patient health files</p>
        </div>
      </div>

      {/* Search Filter bar */}
      <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '0.75rem', borderRadius: 'var(--border-radius)' }}>
        <input
          type="text"
          className="form-input"
          style={{ margin: 0, width: '100%' }}
          placeholder="Search patients by name, email, phone or blood group..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="dashboard-section">
        {filteredPatients.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No matching patients registered.</p>
        ) : (
          <Table headers={['Patient Name', 'Blood Type', 'Date of Birth', 'Emergency Contact', 'Actions']}>
            {filteredPatients.map((pat) => (
              <tr key={pat._id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{pat.user?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} />{pat.user?.email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} />{pat.user?.phoneNumber || 'N/A'}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{pat.bloodType}</td>
                <td>{new Date(pat.dateOfBirth).toLocaleDateString()}</td>
                <td>{pat.emergencyContact}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.35rem' }}
                      onClick={() => handleOpenDetails(pat)}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ padding: '0.35rem' }}
                      onClick={() => handleOpenReports(pat)}
                      title="Patient Reports"
                    >
                      <FolderOpen size={16} />
                    </button>
                    {(user.role === 'admin' || user.role === 'doctor') && (
                      <button
                        className="btn btn-teal btn-sm"
                        style={{ padding: '0.35rem' }}
                        onClick={() => handleOpenEdit(pat)}
                        title="Edit History"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Patient Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Patient Medical Record">
        {selectedPatient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedPatient.user?.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gender: {selectedPatient.user?.gender}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontWeight: 600, color: 'var(--danger)' }}>Blood: {selectedPatient.bloodType}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.25rem' }}>Contact Info</h4>
              <p style={{ fontSize: '0.9rem' }}><strong>Email:</strong> {selectedPatient.user?.email}</p>
              <p style={{ fontSize: '0.9rem' }}><strong>Phone:</strong> {selectedPatient.user?.phoneNumber || 'N/A'}</p>
              <p style={{ fontSize: '0.9rem' }}><strong>Emergency Contact:</strong> {selectedPatient.emergencyContact}</p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.25rem' }}>Allergies</h4>
              {selectedPatient.allergies?.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No known allergies.</p>
              ) : (
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                  {selectedPatient.allergies?.map((all, i) => <li key={i}>{all}</li>)}
                </ul>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: '0.25rem' }}>Medical History</h4>
              {selectedPatient.medicalHistory?.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No previous medical history recorded.</p>
              ) : (
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                  {selectedPatient.medicalHistory?.map((hist, i) => <li key={i}>{hist}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit History Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Patient Records">
        {selectedPatient && (
          <form onSubmit={handleSaveHistory}>
            <div style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
              Updating medical records for <strong>{selectedPatient.user?.name}</strong>.
            </div>

            <div className="form-group">
              <label className="form-label">Allergies (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Peanuts, Penicillin"
                value={editForm.allergies}
                onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Medical History (comma-separated)</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Hypertension, Diabetes, Asthma"
                value={editForm.medicalHistory}
                onChange={(e) => setEditForm({ ...editForm, medicalHistory: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-teal btn-full">
              Save Health Records
            </button>
          </form>
        )}
      </Modal>

      {/* View Reports Modal */}
      <Modal
        isOpen={isReportsModalOpen}
        onClose={() => {
          setIsReportsModalOpen(false);
          setPatientReports([]);
          setSelectedPatient(null);
        }}
        title={`Uploaded Health Files: ${selectedPatient?.user?.name || ''}`}
      >
        {patientReports.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0', textAlign: 'center' }}>
            No health files uploaded by this patient.
          </p>
        ) : (
          <Table headers={['Document Title', 'Upload Date', 'Action']}>
            {patientReports.map((rep) => (
              <tr key={rep._id}>
                <td style={{ fontWeight: 600 }}>{rep.title}</td>
                <td>{new Date(rep.date).toLocaleDateString()}</td>
                <td>
                  <a
                    href={`${BACKEND_URL}${rep.filePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.35rem' }}
                  >
                    <Eye size={16} />
                  </a>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Modal>
    </div>
  );
};

export default Patients;
