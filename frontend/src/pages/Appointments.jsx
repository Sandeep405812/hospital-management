import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Calendar, Plus, Check, X, FileText, Video } from 'lucide-react';

const Appointments = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    departmentId: '',
    date: '',
    timeSlot: '09:00 - 10:00',
    symptoms: '',
  });

  useEffect(() => {
    if (location.state?.openBooking) {
      setIsBookModalOpen(true);
      if (location.state.departmentId) {
        setBookingForm(prev => ({
          ...prev,
          departmentId: location.state.departmentId
        }));
      }
    }
  }, [location]);

  // Prescription Modal State
  const [isPrescribeModalOpen, setIsPrescribeModalOpen] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  const fetchAppointments = async () => {
    try {
      const data = await api.get('/appointments');
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        await fetchAppointments();

        if (user.role === 'patient') {
          const docs = await api.get('/doctors');
          const depts = await api.get('/departments');
          setDoctors(docs);
          setDepartments(depts);
        }
      } catch (error) {
        console.error('Failed to initialize appointments page data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initData();
    }
  }, [user]);

  // Handle booking form submission
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/appointments', bookingForm);
      setIsBookModalOpen(false);
      setBookingForm({
        doctorId: '',
        departmentId: '',
        date: '',
        timeSlot: '09:00 - 10:00',
        symptoms: '',
      });
      fetchAppointments();
      alert('Appointment booked successfully!');
    } catch (error) {
      alert(error.message || 'Booking failed');
    }
  };

  // Status updates (Doctor/Admin)
  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (error) {
      alert(error.message || 'Failed to update status');
    }
  };

  // Prescription medicine handlers
  const handleMedicineChange = (index, field, value) => {
    const list = [...medicines];
    list[index][field] = value;
    setMedicines(list);
  };

  const addMedicineRow = () => {
    setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedicineRow = (index) => {
    const list = [...medicines];
    list.splice(index, 1);
    setMedicines(list);
  };

  const handleIssuePrescription = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prescriptions', {
        appointmentId: activeAppointment._id,
        medicines,
        notes: prescriptionNotes,
      });
      setIsPrescribeModalOpen(false);
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
      setPrescriptionNotes('');
      setActiveAppointment(null);
      fetchAppointments();
      alert('Prescription issued successfully!');
    } catch (error) {
      alert(error.message || 'Failed to issue prescription');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading appointments...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Schedule and view doctor consultations</p>
        </div>
        {user.role === 'patient' && (
          <button className="btn btn-primary" onClick={() => setIsBookModalOpen(true)}>
            <Plus size={18} />
            <span>Book Appointment</span>
          </button>
        )}
      </div>

      <div className="dashboard-section">
        {appointments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No appointments booked yet.</p>
        ) : (
          <Table
            headers={[
              user.role === 'patient' ? 'Doctor' : 'Patient',
              'Department',
              'Date',
              'Time Slot',
              ...(user.role === 'patient' ? ['Queue No.', 'Est. Wait Time'] : []),
              'Symptoms',
              'Status',
              'Actions',
            ]}
          >
            {appointments.map((app) => (
              <tr key={app._id}>
                {user.role === 'patient' ? (
                  <td>
                    <div style={{ fontWeight: 600 }}>{app.doctor?.user?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {app.doctor?.specialization}
                    </div>
                  </td>
                ) : (
                  <td>
                    <div style={{ fontWeight: 600 }}>{app.patient?.user?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Blood: {app.patient?.bloodType}
                    </div>
                  </td>
                )}
                <td>{app.department?.name || 'General'}</td>
                <td>{new Date(app.date).toLocaleDateString()}</td>
                <td>{app.timeSlot}</td>
                {user.role === 'patient' && (
                  <>
                    <td>{app.queuePosition ? `#${app.queuePosition}` : 'N/A'}</td>
                    <td>{app.estimatedWaitTime !== null ? `${app.estimatedWaitTime} mins` : 'N/A'}</td>
                  </>
                )}
                <td>{app.symptoms}</td>
                <td>
                  <span className={`badge badge-${app.status}`}>{app.status}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Patient Cancel action */}
                    {user.role === 'patient' && app.status === 'pending' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleStatusChange(app._id, 'cancelled')}
                      >
                        Cancel
                      </button>
                    )}

                    {/* Doctor/Admin Approval actions */}
                    {(user.role === 'doctor' || user.role === 'admin') && app.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-teal btn-sm"
                          style={{ padding: '0.25rem 0.5rem' }}
                          onClick={() => handleStatusChange(app._id, 'approved')}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.25rem 0.5rem' }}
                          onClick={() => handleStatusChange(app._id, 'cancelled')}
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}

                    {/* Telemedicine Video Call Action */}
                    {app.status === 'approved' && (user.role === 'doctor' || user.role === 'patient') && (
                      <Link
                        to={`/appointments/${app._id}/call`}
                        className="btn btn-teal btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Video size={14} />
                        <span>Join Call</span>
                      </Link>
                    )}

                    {/* Doctor Prescribe action */}
                    {user.role === 'doctor' && app.status === 'approved' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setActiveAppointment(app);
                          setIsPrescribeModalOpen(true);
                        }}
                      >
                        <FileText size={14} />
                        <span>Prescribe</span>
                      </button>
                    )}

                    {app.status === 'completed' && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                        Completed
                      </span>
                    )}

                    {app.status === 'cancelled' && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
                        Cancelled
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Booking Modal (Patient-only) */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Book Doctor Appointment"
      >
        <form onSubmit={handleBookAppointment}>
          <div className="form-group">
            <label className="form-label">Select Department *</label>
            <select
              className="form-select"
              value={bookingForm.departmentId}
              onChange={(e) => {
                const dep = e.target.value;
                setBookingForm({ ...bookingForm, departmentId: dep, doctorId: '' });
              }}
              required
            >
              <option value="">-- Choose Department --</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Select Doctor *</label>
            <select
              className="form-select"
              value={bookingForm.doctorId}
              onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
              required
              disabled={!bookingForm.departmentId}
            >
              <option value="">-- Choose Doctor --</option>
              {doctors
                .filter((doc) => !bookingForm.departmentId || doc.department?._id === bookingForm.departmentId)
                .map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.user?.name} ({doc.specialization} - Fee: ₹{doc.consultationFee})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Preferred Date *</label>
              <input
                type="date"
                className="form-input"
                value={bookingForm.date}
                onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Time Slot *</label>
              <select
                className="form-select"
                value={bookingForm.timeSlot}
                onChange={(e) => setBookingForm({ ...bookingForm, timeSlot: e.target.value })}
                required
              >
                <option value="09:00 - 10:00">09:00 - 10:00 AM</option>
                <option value="10:00 - 11:00">10:00 - 11:00 AM</option>
                <option value="11:00 - 12:00">11:00 - 12:00 PM</option>
                <option value="14:00 - 15:00">02:00 - 03:00 PM</option>
                <option value="15:00 - 16:00">03:00 - 04:00 PM</option>
                <option value="16:00 - 17:00">04:00 - 05:00 PM</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Symptoms / Reasons *</label>
            <textarea
              className="form-textarea"
              placeholder="Describe what symptoms you are experiencing..."
              value={bookingForm.symptoms}
              onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            Confirm Booking
          </button>
        </form>
      </Modal>

      {/* Prescribe Modal (Doctor-only) */}
      <Modal
        isOpen={isPrescribeModalOpen}
        onClose={() => {
          setIsPrescribeModalOpen(false);
          setActiveAppointment(null);
        }}
        title="Write Medical Prescription"
      >
        {activeAppointment && (
          <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
            <p><strong>Patient:</strong> {activeAppointment.patient?.user?.name}</p>
            <p><strong>Symptoms:</strong> {activeAppointment.symptoms}</p>
          </div>
        )}

        <form onSubmit={handleIssuePrescription}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Medicines List *</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addMedicineRow}>
                + Add Medicine
              </button>
            </div>

            {medicines.map((med, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--border-radius-sm)', marginBottom: '0.75rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Medicine #{index + 1}</span>
                  {medicines.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => removeMedicineRow(index)}>
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="form-grid">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Medicine Name (e.g. Paracetamol)"
                    value={med.name}
                    onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Dosage (e.g. 650 mg)"
                    value={med.dosage}
                    onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                    required
                  />
                </div>
                <div className="form-grid">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Frequency (e.g. 1-0-1 after food)"
                    value={med.frequency}
                    onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Duration (e.g. 5 days)"
                    value={med.duration}
                    onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Clinical Notes / Advice</label>
            <textarea
              className="form-textarea"
              placeholder="Add advice, food restrictions, follow-up timelines..."
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-teal btn-full">
            Submit & Complete Appointment
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Appointments;
