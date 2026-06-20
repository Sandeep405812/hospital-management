import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, PlusCircle, Check, X, ShieldAlert, Clock, User } from 'lucide-react';
import Table from '../components/Table';
import Modal from '../components/Modal';
import gsap from 'gsap';

const SurgerySchedule = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [surgeries, setSurgeries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scheduling Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    patientId: '',
    doctorId: '',
    otName: 'OT-1',
    date: '',
    startTime: '09:00',
    endTime: '10:30',
  });

  const fetchSurgeries = async () => {
    try {
      const data = await api.get('/surgeries');
      setSurgeries(data);
    } catch (err) {
      console.error('Failed to fetch surgeries list:', err);
    }
  };

  const initData = async () => {
    try {
      setLoading(true);
      await fetchSurgeries();

      if (user.role === 'admin' || user.role === 'doctor' || user.role === 'receptionist') {
        const pats = await api.get('/patients');
        const docs = await api.get('/doctors');
        setPatients(pats);
        setDoctors(docs);
      }
    } catch (err) {
      console.error('Failed to load scheduling lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // Entrance animations
  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.dashboard-section',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [loading]);

  const handleBookSurgery = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/surgeries', bookingForm);
      setIsBookModalOpen(false);
      setBookingForm({
        patientId: '',
        doctorId: '',
        otName: 'OT-1',
        date: '',
        startTime: '09:00',
        endTime: '10:30',
      });
      await fetchSurgeries();
      alert('Surgery scheduled successfully without conflicts!');
    } catch (err) {
      alert(err.message || 'OT Slot Conflict Encountered');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      setLoading(true);
      await api.put(`/surgeries/${id}/status`, { status });
      await fetchSurgeries();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  if (loading && surgeries.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading OT Slots Scheduler...</div>;
  }

  const isStaff = user.role === 'admin' || user.role === 'doctor' || user.role === 'receptionist';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Operation Theatre Scheduler</h1>
          <p className="page-subtitle">Manage surgery timings and prevent overlapping OT slot collisions</p>
        </div>
        {isStaff && (
          <button className="btn btn-primary" onClick={() => setIsBookModalOpen(true)}>
            <PlusCircle size={18} />
            <span>Book Surgery Slot</span>
          </button>
        )}
      </div>

      {/* active reservations sections */}
      <div className="dashboard-section">
        <h2 className="section-title">OT Booking Log</h2>
        {surgeries.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No surgeries scheduled yet.</p>
        ) : (
          <Table
            headers={[
              'Patient',
              'Surgeon / Doctor',
              'Operation Theatre',
              'Date',
              'Timings',
              'Status',
              ...(isStaff ? ['Actions'] : []),
            ]}
          >
            {surgeries.map((surg) => (
              <tr key={surg._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{surg.patient?.user?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Blood: {surg.patient?.bloodType}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{surg.doctor?.user?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {surg.doctor?.specialization}
                  </div>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>{surg.otName}</td>
                <td>{new Date(surg.date).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                    <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span>{surg.startTime} - {surg.endTime}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${surg.status === 'scheduled' ? 'approved' : surg.status}`}>
                    {surg.status}
                  </span>
                </td>
                {isStaff && (
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {surg.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(surg._id, 'ongoing')}
                            className="btn btn-teal btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Start Op
                          </button>
                          <button
                            onClick={() => handleStatusChange(surg._id, 'cancelled')}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {surg.status === 'ongoing' && (
                        <button
                          onClick={() => handleStatusChange(surg._id, 'completed')}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Complete
                        </button>
                      )}
                      {surg.status === 'completed' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                          Success
                        </span>
                      )}
                      {surg.status === 'cancelled' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Cancelled
                        </span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* OT Booking Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Schedule Operation Theatre (OT)"
      >
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.12)', borderRadius: 'var(--border-radius)', marginBottom: '1.25rem' }}>
          <ShieldAlert size={20} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>Conflict Check:</strong> The booking engine automatically cross-references other schedules and blocks overlaps for OTs and Surgeons.
          </span>
        </div>

        <form onSubmit={handleBookSurgery}>
          <div className="form-group">
            <label className="form-label">Select Patient *</label>
            <select
              className="form-select"
              value={bookingForm.patientId}
              onChange={(e) => setBookingForm({ ...bookingForm, patientId: e.target.value })}
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((pat) => (
                <option key={pat._id} value={pat._id}>
                  {pat.user?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Select Surgeon / Doctor *</label>
            <select
              className="form-select"
              value={bookingForm.doctorId}
              onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
              required
            >
              <option value="">-- Choose Doctor --</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.user?.name} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Select Operation Theatre *</label>
            <select
              className="form-select"
              value={bookingForm.otName}
              onChange={(e) => setBookingForm({ ...bookingForm, otName: e.target.value })}
              required
            >
              <option value="OT-1">OT-1 (Major Cardiac/Orthopedic)</option>
              <option value="OT-2">OT-2 (General Surgery)</option>
              <option value="OT-3">OT-3 (Pediatrics/Ophthalmology)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Surgery Date *</label>
            <input
              type="date"
              className="form-input"
              value={bookingForm.date}
              onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Start Time (24h) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 09:30"
                value={bookingForm.startTime}
                onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time (24h) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 11:00"
                value={bookingForm.endTime}
                onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}>
            Book & Validate OT Slot
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default SurgerySchedule;
