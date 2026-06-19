import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { FileText, Eye, Printer, User, Calendar } from 'lucide-react';

const Prescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const fetchPrescriptions = async () => {
    try {
      const data = await api.get('/prescriptions');
      setPrescriptions(data);
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await fetchPrescriptions();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleOpenDetails = async (id) => {
    try {
      const data = await api.get(`/prescriptions/${id}`);
      setSelectedPrescription(data);
      setIsDetailModalOpen(true);
    } catch (error) {
      alert('Failed to load details');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('print-area');
    const opt = {
      margin:       0.5,
      filename:     `Prescription-${selectedPrescription._id.slice(-6).toUpperCase()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, logging: false, backgroundColor: '#0f172a', useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };

  const handleSetReminder = (med) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    const time = prompt(`Set reminder time for ${med.name} (Format 24h: HH:MM, e.g. 08:30 or 20:00):`, '08:00');
    if (!time) return;

    const regex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!regex.test(time)) {
      alert('Invalid time format. Please use HH:MM (24-hour clock).');
      return;
    }

    const currentReminders = JSON.parse(localStorage.getItem('medicine_reminders') || '[]');
    currentReminders.push({
      id: `${med.name}-${time}-${Date.now()}`,
      name: med.name,
      dosage: med.dosage,
      time: time,
    });
    localStorage.setItem('medicine_reminders', JSON.stringify(currentReminders));
    alert(`Reminder alarm set for ${med.name} at ${time} daily!`);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading prescriptions...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Prescriptions</h1>
          <p className="page-subtitle">Medical prescriptions and drug schedules</p>
        </div>
      </div>

      <div className="dashboard-section">
        {prescriptions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No prescriptions found.</p>
        ) : (
          <Table headers={['Date', user.role === 'patient' ? 'Doctor' : 'Patient', 'Medicines Count', 'Advice/Notes', 'Actions']}>
            {prescriptions.map((script) => (
              <tr key={script._id}>
                <td>{new Date(script.date).toLocaleDateString()}</td>
                {user.role === 'patient' ? (
                  <td>
                    <div style={{ fontWeight: 600 }}>{script.doctor?.user?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{script.doctor?.specialization}</div>
                  </td>
                ) : (
                  <td>
                    <div style={{ fontWeight: 600 }}>{script.patient?.user?.name}</div>
                  </td>
                )}
                <td>{script.medicines?.length} medicines</td>
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {script.notes || 'None'}
                </td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.35rem' }}
                    onClick={() => handleOpenDetails(script._id)}
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Prescription Invoice Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Prescription Details">
        {selectedPrescription && (
          <div id="print-area" style={{ padding: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius)' }}>
            
            {/* Header / Hospital details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--accent-blue)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ color: 'var(--accent-blue)', fontWeight: 800, margin: 0 }}>🏥 AS HOSPITAL</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>123 Health Street, City Hospital</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Rx Prescription</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date: {new Date(selectedPrescription.date).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Doctors & Patients details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--accent-teal)', fontWeight: 600, marginBottom: '0.25rem' }}>Doctor Details</p>
                <p><strong>{selectedPrescription.doctor?.user?.name}</strong></p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedPrescription.doctor?.specialization}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Degree: {selectedPrescription.doctor?.qualification}</p>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--accent-teal)', fontWeight: 600, marginBottom: '0.25rem' }}>Patient Details</p>
                <p><strong>{selectedPrescription.patient?.user?.name}</strong></p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gender: {selectedPrescription.patient?.user?.gender}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Blood Group: {selectedPrescription.patient?.bloodType}</p>
              </div>
            </div>

            {/* Medicines list table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>Prescribed Medicines</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    {user.role === 'patient' && <th>Reminders</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedPrescription.medicines?.map((med, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 600 }}>{med.name}</td>
                      <td>{med.dosage}</td>
                      <td>{med.frequency}</td>
                      <td>{med.duration}</td>
                      {user.role === 'patient' && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-teal btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleSetReminder(med)}
                          >
                            Set Alarm
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Advice/Notes */}
            {selectedPrescription.notes && (
              <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid var(--warning)', borderRadius: 'var(--border-radius-sm)' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.25rem' }}>Clinical Advice / Notes</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedPrescription.notes}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.5rem' }}>
              <button type="button" className="btn btn-teal btn-sm" onClick={handleDownloadPDF}>
                <FileText size={16} />
                <span>Download PDF</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Rx</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Prescriptions;
