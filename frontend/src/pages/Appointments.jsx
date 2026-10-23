import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Calendar, Plus, Check, X, FileText, Video } from 'lucide-react';
import { sendMockWhatsapp } from '../utils/whatsapp';

const Appointments = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [groupByDate, setGroupByDate] = useState(true);

  // Patient History Lookup Modal State (Doctor/Admin)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchId, setHistorySearchId] = useState('');

  // Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    departmentId: '',
    date: '',
    timeSlot: '',
    symptoms: '',
  });

  // Doctor Availability slots state
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch booked slots for selected doctor and date
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!bookingForm.doctorId || !bookingForm.date) {
        setBookedSlots([]);
        return;
      }
      try {
        setLoadingSlots(true);
        const data = await api.get(
          `/appointments/booked-slots?doctorId=${bookingForm.doctorId}&date=${bookingForm.date}`
        );
        setBookedSlots(data);
      } catch (err) {
        console.error('Failed to load booked slots', err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchBookedSlots();
  }, [bookingForm.doctorId, bookingForm.date]);

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

  const fetchAppointments = async (customStart, customEnd) => {
    try {
      let queryUrl = '/appointments';
      const s = customStart !== undefined ? customStart : startDateFilter;
      const e = customEnd !== undefined ? customEnd : endDateFilter;
      const params = [];
      if (s) params.push(`startDate=${s}`);
      if (e) params.push(`endDate=${e}`);
      if (params.length > 0) {
        queryUrl += `?${params.join('&')}`;
      }
      const data = await api.get(queryUrl);
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const handleOpenPatientHistory = async (patientUniqueId) => {
    if (!patientUniqueId) return;
    setLoadingHistory(true);
    setIsHistoryModalOpen(true);
    try {
      const data = await api.get(`/patients/history/${patientUniqueId}`);
      setSelectedPatientHistory(data);
    } catch (err) {
      alert(err.message || 'Failed to fetch patient history');
      setIsHistoryModalOpen(false);
    } finally {
      setLoadingHistory(false);
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
    if (!bookingForm.date || !bookingForm.timeSlot) {
      alert('Please select a visual date and time slot from the weekly timetable!');
      return;
    }
    try {
      await api.post('/appointments', bookingForm);
      setIsBookModalOpen(false);
      setBookingForm({
        doctorId: '',
        departmentId: '',
        date: '',
        timeSlot: '',
        symptoms: '',
      });
      fetchAppointments();
      sendMockWhatsapp(`✅ *[AS HOSPITAL]* New Appointment Request!\nDear Patient, we have received your booking request for a consultation. Status: PENDING approval. Check details at http://localhost:5173/appointments`);
      alert('Appointment booked successfully!');
    } catch (error) {
      alert(error.message || 'Booking failed');
    }
  };

  // Status updates (Doctor/Admin)
  const handleStatusChange = async (id, status) => {
    try {
      const app = appointments.find((a) => a._id === id);
      await api.put(`/appointments/${id}/status`, { status });
      fetchAppointments();

      if (app) {
        const docName = app.doctor?.user?.name || 'Doctor';
        if (status === 'approved') {
          sendMockWhatsapp(`📅 *[AS HOSPITAL]* Appointment Approved!\nYour consultation with Dr. ${docName} on ${new Date(app.date).toLocaleDateString()} at ${app.timeSlot} is confirmed.\nJoin call room here: http://localhost:5173/appointments/${app._id}/call`);
        } else if (status === 'cancelled') {
          sendMockWhatsapp(`❌ *[AS HOSPITAL]* Appointment Cancelled.\nYour appointment with Dr. ${docName} has been cancelled. Please reschedule at http://localhost:5173/appointments`);
        }
      }
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

  const filteredAppointments = appointments.filter((app) => {
    const doctorName = app.doctor?.user?.name || '';
    const patientName = app.patient?.user?.name || '';
    const patientId = app.patient?.patientId || '';
    const symptoms = app.symptoms || '';
    const matchesSearch = 
      doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      symptoms.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesDate = !dateFilter || new Date(app.date).toDateString() === new Date(dateFilter).toDateString();

    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
    // Primary sort: Date
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    // Secondary sort: Serial Number (FIFO - first booked gets #1)
    const serialA = a.serialNumber || a.queuePosition || 999;
    const serialB = b.serialNumber || b.queuePosition || 999;
    return serialA - serialB;
  });

  // Timetable grid layout scheduler
  const renderWeeklyTimetable = () => {
    if (!bookingForm.doctorId) return null;
    const selectedDocObj = doctors.find((d) => d._id === bookingForm.doctorId);
    if (!selectedDocObj) return null;

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dates = [];

    // Next 5 days
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        isoString: d.toISOString().split('T')[0],
        dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
        dayName: weekdays[d.getDay()]
      });
    }

    const slotsTemplate = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

    return (
      <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
        <label className="form-label">🔍 Select Time Slot from Weekly Timetable Grid</label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.6rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem'
        }}>
          {dates.map((dt) => {
            const isDateSelected = bookingForm.date === dt.isoString;
            return (
              <div key={dt.isoString} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '75px' }}>
                <div style={{
                  fontSize: '0.72rem', fontWeight: '800', textAlign: 'center',
                  background: isDateSelected ? 'var(--accent-blue)' : 'rgba(255,255,255,0.03)',
                  padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--glass-border)',
                  color: isDateSelected ? '#fff' : 'var(--text-secondary)'
                }}>
                  <div>{dt.dayName.slice(0, 3)}</div>
                  <div style={{ fontSize: '0.62rem', opacity: 0.8 }}>{dt.dateLabel}</div>
                </div>

                {slotsTemplate.map((slot) => {
                  const isBooked = bookedSlots.includes(slot) && bookingForm.date === dt.isoString;
                  const isSelected = bookingForm.date === dt.isoString && bookingForm.timeSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => {
                        setBookingForm({
                          ...bookingForm,
                          date: dt.isoString,
                          timeSlot: slot
                        });
                      }}
                      style={{
                        fontSize: '0.68rem', padding: '0.3rem 0.2rem', borderRadius: '4px',
                        border: isSelected ? '1.5px solid var(--accent-blue)' : '1px solid var(--glass-border)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : isBooked ? 'rgba(244,63,94,0.04)' : 'rgba(255,255,255,0.01)',
                        color: isSelected ? 'var(--accent-blue)' : isBooked ? 'var(--danger)' : '#fff',
                        cursor: isBooked ? 'not-allowed' : 'pointer',
                        opacity: isBooked ? 0.45 : 1,
                        textDecoration: isBooked ? 'line-through' : 'none',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      {slot.replace(' ', '')}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
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

      {/* Search & Filter Controls */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem',
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
        padding: '1.25rem', borderRadius: 'var(--border-radius)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-input"
              style={{ margin: 0, width: '100%' }}
              placeholder="Search by Patient ID (e.g. PID-1001), name or symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ width: '170px' }}>
            <select
              className="form-select"
              style={{ margin: 0 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Quick Date Range for Doctor/Admin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From:</span>
              <input
                type="date"
                className="form-input"
                style={{ margin: 0, width: '145px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  fetchAppointments(e.target.value, endDateFilter);
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To:</span>
              <input
                type="date"
                className="form-input"
                style={{ margin: 0, width: '145px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  fetchAppointments(startDateFilter, e.target.value);
                }}
              />
            </div>
          </div>

          {(searchQuery || statusFilter !== 'All' || dateFilter || startDateFilter || endDateFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
                setDateFilter('');
                setStartDateFilter('');
                setEndDateFilter('');
                fetchAppointments('', '');
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Date Presets & Doctor Quick Patient Lookup */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Quick Range:</span>
            {[
              { label: 'All Dates', start: '', end: '' },
              { label: 'Today', start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
              { 
                label: 'Next 7 Days', 
                start: new Date().toISOString().split('T')[0], 
                end: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] 
              },
              { 
                label: 'This Month', 
                start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
                end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] 
              },
            ].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setStartDateFilter(p.start);
                  setEndDateFilter(p.end);
                  fetchAppointments(p.start, p.end);
                }}
                style={{
                  background: startDateFilter === p.start && endDateFilter === p.end ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  color: '#fff',
                  borderRadius: '100px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Quick Patient History Lookup Bar (Doctor / Admin) */}
          {(user.role === 'doctor' || user.role === 'admin' || user.role === 'receptionist') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Enter Patient ID (e.g. PID-1001)..."
                value={historySearchId}
                onChange={(e) => setHistorySearchId(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.78rem',
                  width: '180px'
                }}
              />
              <button
                type="button"
                className="btn btn-teal btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                onClick={() => handleOpenPatientHistory(historySearchId)}
              >
                🔍 Patient History
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-section">
        {filteredAppointments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No appointments found for the selected criteria.</p>
        ) : (
          <Table
            headers={[
              'Token / Serial',
              user.role === 'patient' ? 'Doctor' : 'Patient (Unique ID)',
              'Department',
              'Date',
              'Time Slot',
              'Symptoms',
              'Status',
              'Actions',
            ]}
          >
            {filteredAppointments.map((app) => (
              <tr key={app._id}>
                {/* Serial / Token Number (FIFO Order) */}
                <td>
                  <span style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: 'var(--accent-blue)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}>
                    #{app.serialNumber || app.queuePosition || 1}
                  </span>
                </td>

                {user.role === 'patient' ? (
                  <td>
                    <div style={{ fontWeight: 600 }}>Dr. {app.doctor?.user?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {app.doctor?.specialization}
                    </div>
                  </td>
                ) : (
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 600 }}>{app.patient?.user?.name}</div>
                      {app.patient?.patientId && (
                        <span 
                          onClick={() => handleOpenPatientHistory(app.patient?.patientId)}
                          style={{
                            background: 'rgba(20, 184, 166, 0.15)',
                            color: 'var(--accent-teal)',
                            border: '1px solid rgba(20, 184, 166, 0.3)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                          title="Click to view full medical history"
                        >
                          {app.patient?.patientId}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Blood: {app.patient?.bloodType || 'N/A'} {app.patient?.user?.phoneNumber ? `· 📞 ${app.patient?.user?.phoneNumber}` : ''}
                    </div>
                  </td>
                )}
                <td>{app.department?.name || 'General'}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(app.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {new Date(app.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{app.timeSlot}</span>
                </td>
                <td>{app.symptoms}</td>
                <td>
                  <span className={`badge badge-${app.status}`}>{app.status}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Doctor/Admin View Patient History button */}
                    {(user.role === 'doctor' || user.role === 'admin' || user.role === 'receptionist') && app.patient?.patientId && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                        title="View Patient Clinical History"
                        onClick={() => handleOpenPatientHistory(app.patient?.patientId)}
                      >
                        History
                      </button>
                    )}
                    {user.role === 'patient' && app.status === 'pending' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleStatusChange(app._id, 'cancelled')}
                      >
                        Cancel
                      </button>
                    )}

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

                    {app.status === 'approved' && (
                      <Link
                        to={`/appointments/${app._id}/call`}
                        className="btn btn-teal btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Video size={14} />
                        <span>Join Call</span>
                      </Link>
                    )}

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
                setBookingForm({ ...bookingForm, departmentId: dep, doctorId: '', date: '', timeSlot: '' });
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
              onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value, date: '', timeSlot: '' })}
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

          {/* Render Timetable Grid Selector */}
          {renderWeeklyTimetable()}

          {/* Selected Schedule display panel */}
          {bookingForm.date && bookingForm.timeSlot && (
            <div style={{
              fontSize: '0.8rem', color: 'var(--accent-teal)', fontWeight: 700,
              background: 'rgba(20, 184, 166, 0.08)', padding: '0.5rem', borderRadius: '4px',
              border: '1px solid rgba(20, 184, 166, 0.2)', marginBottom: '1.25rem', textAlign: 'center'
            }}>
              Selected Schedule: {new Date(bookingForm.date).toLocaleDateString()} at {bookingForm.timeSlot}
            </div>
          )}

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

      {/* ─── PATIENT CLINICAL HISTORY MODAL (Doctor/Admin/Receptionist) ─── */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedPatientHistory(null);
        }}
        title={`🏥 Patient Medical History & Records`}
      >
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Loading patient comprehensive medical records...
          </div>
        ) : selectedPatientHistory ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.4rem' }}>
            {/* Patient Header Card */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--border-radius)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                    {selectedPatientHistory.patient?.user?.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      background: 'var(--accent-teal)',
                      color: '#0f172a',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 800,
                      fontSize: '0.75rem'
                    }}>
                      {selectedPatientHistory.patient?.patientId}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Gender: {selectedPatientHistory.patient?.user?.gender || 'N/A'} · Blood: {selectedPatientHistory.patient?.bloodType || 'N/A'}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>📞 {selectedPatientHistory.patient?.user?.phoneNumber || 'N/A'}</div>
                  <div>✉️ {selectedPatientHistory.patient?.user?.email || 'N/A'}</div>
                </div>
              </div>

              {/* Allergies & Medical History Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>Known Allergies</div>
                  <div style={{ fontSize: '0.82rem', color: '#fff', marginTop: '0.2rem' }}>
                    {selectedPatientHistory.patient?.allergies?.length > 0 
                      ? selectedPatientHistory.patient.allergies.join(', ') 
                      : 'None recorded'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Past Medical Conditions</div>
                  <div style={{ fontSize: '0.82rem', color: '#fff', marginTop: '0.2rem' }}>
                    {selectedPatientHistory.patient?.medicalHistory?.length > 0 
                      ? selectedPatientHistory.patient.medicalHistory.join(', ') 
                      : 'None recorded'}
                  </div>
                </div>
              </div>
            </div>

            {/* Prescriptions History Section */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                💊 Past Prescriptions ({selectedPatientHistory.prescriptions?.length || 0})
              </h4>
              {selectedPatientHistory.prescriptions?.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No previous prescriptions found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {selectedPatientHistory.prescriptions?.map((pres, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        <span>👨‍⚕️ Prescribed by: Dr. {pres.doctor?.user?.name || 'Doctor'}</span>
                        <span>{new Date(pres.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                        {pres.medicines?.map((m, mIdx) => (
                          <span key={mIdx} style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#93c5fd',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            {m.name} ({m.dosage}) - {m.frequency} [{m.duration}]
                          </span>
                        ))}
                      </div>
                      {pres.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                          Note: "{pres.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Consultations / Appointments */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                📅 Consultation History ({selectedPatientHistory.appointments?.length || 0})
              </h4>
              {selectedPatientHistory.appointments?.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No previous consultations.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedPatientHistory.appointments?.slice(0, 6).map((app, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{app.symptoms}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          Dr. {app.doctor?.user?.name || 'Doctor'} · {app.department?.name || 'General'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>{new Date(app.date).toLocaleDateString()}</div>
                        <span className={`badge badge-${app.status}`} style={{ fontSize: '0.65rem' }}>{app.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medical Reports */}
            {selectedPatientHistory.reports?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                  📑 Diagnostic Reports ({selectedPatientHistory.reports.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedPatientHistory.reports.map((rep, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      display: 'flex', justifyContent: 'space-between'
                    }}>
                      <span>📄 {rep.title || 'Diagnostic Test'}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{new Date(rep.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Appointments;
