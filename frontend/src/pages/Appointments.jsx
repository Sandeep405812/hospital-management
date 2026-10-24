import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import {
  Calendar,
  Plus,
  Check,
  X,
  FileText,
  Video,
  Mic,
  Tv,
  Play,
  Bell,
  Stethoscope,
  QrCode,
  CreditCard,
  Banknote,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { sendMockWhatsapp } from '../utils/whatsapp';

const Appointments = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Doctor OPD Consultation Desk & Calling State
  const [selectedDeskDoctorId, setSelectedDeskDoctorId] = useState('');
  const [callingNext, setCallingNext] = useState(false);
  const [callMessage, setCallMessage] = useState('');

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [groupByDate, setGroupByDate] = useState(true);

  // Patient History Lookup Modal State (Doctor/Admin)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchId, setHistorySearchId] = useState('');

  // Booking Modal State (with Real-life eSanjeevani Open OPD Window & Instant Payment)
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    departmentId: '',
    date: '',
    timeSlot: '',
    symptoms: '',
    paymentMethod: 'UPI',
    paymentStatus: 'Paid',
    transactionId: '',
    isPaymentVerified: false,
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
  const [isRecording, setIsRecording] = useState(false);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrescriptionNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsRecording(false);
    }
  };

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
        const [docs, depts] = await Promise.all([
          api.get('/doctors').catch(() => []),
          api.get('/departments').catch(() => []),
        ]);
        setDoctors(docs);
        setDepartments(depts);
        if (docs.length > 0) {
          const myDoc = docs.find((d) => d.user?._id === user?._id || d.user === user?._id);
          setSelectedDeskDoctorId(myDoc ? myDoc._id : docs[0]._id);
        }
        await fetchAppointments();
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

  // Audio notification chime for Hospital OPD queue calling
  const playHospitalChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.18); // E5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);
      osc2.start(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.7);
    } catch (e) {
      console.log('Chime sound could not play:', e);
    }
  };

  // Call Next Patient in Doctor's Queue (auto-advances queue)
  const handleCallNextPatient = async (targetDocId) => {
    const docId = targetDocId || selectedDeskDoctorId || (doctors.find(d => d.user?._id === user?._id || d.user === user?._id)?._id);
    if (!docId) {
      alert('Please select a doctor for the OPD consultation desk.');
      return;
    }
    setCallingNext(true);
    try {
      const res = await api.post('/appointments/call-next', { doctorId: docId });
      playHospitalChime();
      setCallMessage(res.message);
      setTimeout(() => setCallMessage(''), 7000);
      await fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to call next patient');
    } finally {
      setCallingNext(false);
    }
  };

  // Handle booking form submission with MANDATORY upfront payment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookingForm.date || !bookingForm.timeSlot) {
      alert('Please select an OPD Session window and date from the timetable!');
      return;
    }

    if (!bookingForm.isPaymentVerified) {
      alert('⚠️ Payment is mandatory at the time of appointment booking! Please click "Pay & Verify" via UPI QR or Card above to generate your Token.');
      return;
    }

    try {
      const payload = {
        doctorId: bookingForm.doctorId,
        departmentId: bookingForm.departmentId,
        date: bookingForm.date,
        timeSlot: bookingForm.timeSlot,
        symptoms: bookingForm.symptoms,
        paymentMethod: bookingForm.paymentMethod || 'UPI',
        paymentStatus: 'Paid',
        transactionId: bookingForm.transactionId || `UPI${Date.now().toString().slice(-8)}`,
      };

      const res = await api.post('/appointments', payload);
      setIsBookModalOpen(false);
      setBookingForm({
        doctorId: '',
        departmentId: '',
        date: '',
        timeSlot: '',
        symptoms: '',
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        transactionId: '',
        isPaymentVerified: false,
      });
      await fetchAppointments();
      const bookedDoc = doctors.find(d => d._id === payload.doctorId);
      const docName = bookedDoc?.user?.name || 'Doctor';
      sendMockWhatsapp(`🎟️ *[CARE HMS OPD]* Token Generated!\nDear Patient, your appointment with Dr. ${docName} on ${payload.date} (${payload.timeSlot}) is confirmed with Token #${res.appointment?.serialNumber || 1}.\nPayment: PAID upfront (₹${bookedDoc?.consultationFee || 500}) via ${payload.paymentMethod} (Ref: ${payload.transactionId}).\nTrack live queue on TV screen: http://localhost:5173/queue-tv`);
      alert(res.message || 'Appointment booked & paid successfully!');
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
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q ||
      doctorName.toLowerCase().includes(q) ||
      patientName.toLowerCase().includes(q) ||
      patientId.toLowerCase().includes(q) ||
      symptoms.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || app.status?.toLowerCase() === statusFilter.toLowerCase();

    const matchesDoctor = doctorFilter === 'All' || app.doctor?._id === doctorFilter;

    const appDeptId = app.department?._id || app.doctor?.department?._id || app.department;
    const matchesDept = departmentFilter === 'All' || appDeptId === departmentFilter;

    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const appDateVal = new Date(app.date).setHours(0, 0, 0, 0);
      if (startDateFilter) {
        const sVal = new Date(startDateFilter).setHours(0, 0, 0, 0);
        if (appDateVal < sVal) matchesDate = false;
      }
      if (endDateFilter) {
        const eVal = new Date(endDateFilter).setHours(23, 59, 59, 999);
        if (appDateVal > eVal) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDoctor && matchesDept && matchesDate;
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

  // Timetable grid layout scheduler (Open-access OPD Session Windows - eSanjeevani Model)
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

    // Flexible OPD Windows where any number of patients can register (eSanjeevani model)
    const opdSessions = [
      { slot: '09:00 AM - 11:00 AM', label: 'Morning OPD' },
      { slot: '11:30 AM - 01:30 PM', label: 'Mid-Day OPD' },
      { slot: '02:00 PM - 05:00 PM', label: 'Evening OPD' },
      { slot: '05:30 PM - 07:30 PM', label: 'Specialist OPD' },
    ];

    return (
      <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.3rem' }}>
          <label className="form-label" style={{ margin: 0 }}>
            🏥 Select OPD Session Window (eSanjeevani Model)
          </label>
          <span style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', fontWeight: 700 }}>
            ⚡ No Slot Blocking · Open Patient Admission
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Like real hospital OPDs, patients can register for the doctor's active window and are consulted in FIFO Token order.
        </p>

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
              <div key={dt.isoString} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '85px' }}>
                <div style={{
                  fontSize: '0.72rem', fontWeight: '800', textAlign: 'center',
                  background: isDateSelected ? 'var(--accent-blue)' : 'rgba(255,255,255,0.03)',
                  padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--glass-border)',
                  color: isDateSelected ? '#fff' : 'var(--text-secondary)'
                }}>
                  <div>{dt.dayName.slice(0, 3)}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>{dt.dateLabel}</div>
                </div>

                {opdSessions.map(({ slot, label }) => {
                  const isSelected = bookingForm.date === dt.isoString && bookingForm.timeSlot === slot;
                  // Count existing bookings for this doctor & date
                  const bookedInDay = appointments.filter(
                    (a) => (a.doctor?._id === bookingForm.doctorId || a.doctor === bookingForm.doctorId) &&
                           a.date && new Date(a.date).toISOString().split('T')[0] === dt.isoString
                  ).length;

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setBookingForm({
                          ...bookingForm,
                          date: dt.isoString,
                          timeSlot: slot
                        });
                      }}
                      style={{
                        fontSize: '0.67rem', padding: '0.4rem 0.25rem', borderRadius: '4px',
                        border: isSelected ? '1.5px solid var(--accent-blue)' : '1px solid var(--glass-border)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.22)' : 'rgba(255,255,255,0.02)',
                        color: isSelected ? 'var(--accent-blue)' : '#fff',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.15rem'
                      }}
                      title={`${label} (${slot}) - Current registrations: ${bookedInDay}`}
                    >
                      <span style={{ fontWeight: 700 }}>{slot.split(' - ')[0]}</span>
                      <span style={{ fontSize: '0.58rem', opacity: 0.8, color: 'var(--accent-teal)' }}>
                        {bookedInDay > 0 ? `${bookedInDay} in queue` : 'Available'}
                      </span>
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

  const todayStr = new Date().toISOString().split('T')[0];
  const activeDocObj = doctors.find((d) => d._id === selectedDeskDoctorId) || (doctors.length > 0 ? doctors[0] : null);
  const targetDocId = activeDocObj?._id || '';

  const todayDeskApps = appointments.filter((a) => {
    const aDocId = a.doctor?._id || a.doctor;
    const isThisDoc = targetDocId ? aDocId === targetDocId : true;
    const isToday = a.date && new Date(a.date).toISOString().split('T')[0] === todayStr;
    return isThisDoc && isToday;
  });

  const ongoingPatient = todayDeskApps.find((a) => a.status === 'ongoing');
  const waitingPatients = todayDeskApps
    .filter((a) => ['approved', 'waiting', 'pending'].includes(a.status))
    .sort((a, b) => (a.serialNumber || 999) - (b.serialNumber || 999));
  const completedTodayCount = todayDeskApps.filter((a) => a.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments & OPD Desk</h1>
          <p className="page-subtitle">Schedule, manage queue tokens, and conduct doctor consultations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-teal"
            onClick={() => window.open('/queue-tv', '_blank')}
            title="Open Live TV Token Board for Hospital Waiting Halls"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Tv size={17} />
            <span>Live OPD TV Screen</span>
          </button>
          {user.role === 'patient' && (
            <button className="btn btn-primary" onClick={() => setIsBookModalOpen(true)}>
              <Plus size={18} />
              <span>Book Appointment</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── DOCTOR OPD CONSULTATION DESK & AUTO CALL CONSOLE ─── */}
      {(user.role === 'doctor' || user.role === 'admin' || user.role === 'superadmin' || user.role?.startsWith('admin_') || user.role === 'receptionist') && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1.5px solid rgba(59, 130, 246, 0.35)',
          borderRadius: 'var(--border-radius)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
        }}>
          {/* Header with Doctor info & Next Call button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: 'var(--accent-blue)',
                padding: '0.6rem',
                borderRadius: '10px'
              }}>
                <Stethoscope size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Doctor OPD Consultation Desk
                  </h2>
                  <span style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    ● Live OPD Station
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Auto-advances queue: Click <strong>"Call Next Patient"</strong> to automatically admit the next token into consultation cabin.
                </p>
              </div>
            </div>

            {/* Doctor selector for Admins/Receptionists */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {user.role !== 'doctor' && doctors.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Station Doctor:</span>
                  <select
                    className="form-select"
                    style={{ margin: 0, padding: '0.4rem 0.75rem', fontSize: '0.82rem', width: '210px' }}
                    value={selectedDeskDoctorId}
                    onChange={(e) => setSelectedDeskDoctorId(e.target.value)}
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        Dr. {d.user?.name || 'Doctor'} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* CALL NEXT PATIENT BUTTON */}
              <button
                type="button"
                className="btn btn-teal"
                disabled={callingNext || waitingPatients.length === 0}
                onClick={() => handleCallNextPatient(targetDocId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.25rem',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  background: waitingPatients.length === 0 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                  boxShadow: waitingPatients.length > 0 ? '0 0 15px rgba(20, 184, 166, 0.4)' : 'none',
                  cursor: waitingPatients.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <Play size={18} fill="currentColor" />
                <span>{callingNext ? 'Calling Next Patient...' : '▶ Call Next Patient'}</span>
              </button>
            </div>
          </div>

          {/* Audio/Alert Notification Toast */}
          {callMessage && (
            <div style={{
              marginTop: '0.85rem',
              background: 'rgba(20, 184, 166, 0.2)',
              border: '1px solid var(--accent-teal)',
              color: '#fff',
              padding: '0.6rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Bell size={18} />
              <span>{callMessage}</span>
            </div>
          )}

          {/* Active Cabin vs Next in Queue Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {/* Current Patient In Cabin */}
            <div style={{
              background: ongoingPatient ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: ongoingPatient ? '1.5px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: ongoingPatient ? '#4ade80' : 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  {ongoingPatient ? '🟢 Current Patient in Cabin' : '⚪ Consultation Cabin'}
                </span>
                {ongoingPatient && (
                  <span style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    Token #{ongoingPatient.serialNumber}
                  </span>
                )}
              </div>

              {ongoingPatient ? (
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                    {ongoingPatient.patient?.user?.name || 'Patient'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    ID: {ongoingPatient.patient?.patientId} · Symptoms: {ongoingPatient.symptoms || 'General Consultation'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <Link
                      to={`/appointments/${ongoingPatient._id}/call`}
                      className="btn btn-teal btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                    >
                      <Video size={13} />
                      <span>Join Cabin Call</span>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setActiveAppointment(ongoingPatient);
                        setIsPrescribeModalOpen(true);
                      }}
                    >
                      <FileText size={13} />
                      <span>Prescribe</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                  Cabin is currently vacant. Click <strong>"▶ Call Next Patient"</strong> to admit Token #{waitingPatients[0]?.serialNumber || '1'}.
                </div>
              )}
            </div>

            {/* Next Patient Preview & Queue Stats */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
                    👉 Next in Waiting Queue
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Total Waiting: <strong>{waitingPatients.length}</strong>
                  </span>
                </div>

                {waitingPatients.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: 'var(--accent-blue)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 800,
                        fontSize: '0.85rem'
                      }}>
                        #{waitingPatients[0].serialNumber}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                        {waitingPatients[0].patient?.user?.name || 'Patient'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                      Session: {waitingPatients[0].timeSlot} · Reason: {waitingPatients[0].symptoms}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                    🎉 No patients currently waiting in today's queue!
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Today's Completed: <strong style={{ color: '#4ade80' }}>{completedTodayCount}</strong></span>
                <button
                  type="button"
                  onClick={() => window.open('/queue-tv', '_blank')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-teal)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                >
                  <Tv size={13} />
                  <span>Waiting Hall TV Board ↗</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div style={{ width: '160px' }}>
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

          {/* Doctor filter dropdown for non-doctors */}
          {user.role !== 'doctor' && doctors.length > 0 && (
            <div style={{ width: '175px' }}>
              <select
                className="form-select"
                style={{ margin: 0 }}
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
              >
                <option value="All">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.user?.name || 'Doctor'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department filter dropdown */}
          {departments.length > 0 && (
            <div style={{ width: '165px' }}>
              <select
                className="form-select"
                style={{ margin: 0 }}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="All">All Wings</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Date Range for Doctor/Admin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From:</span>
              <input
                type="date"
                className="form-input"
                style={{ margin: 0, width: '135px', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
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
                style={{ margin: 0, width: '135px', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  fetchAppointments(startDateFilter, e.target.value);
                }}
              />
            </div>
          </div>

          {(searchQuery || statusFilter !== 'All' || doctorFilter !== 'All' || departmentFilter !== 'All' || startDateFilter || endDateFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
                setDoctorFilter('All');
                setDepartmentFilter('All');
                setDateFilter('');
                setStartDateFilter('');
                setEndDateFilter('');
                fetchAppointments('', '');
              }}
            >
              Reset Filters
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
              'Fee & Payment',
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
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                      ₹{app.fee || 500}
                    </span>
                    <span style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#4ade80',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      width: 'fit-content'
                    }}>
                      ✓ Paid ({app.paymentMethod || 'UPI'})
                    </span>
                  </div>
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

                    {/* Patient can cancel their waiting booking */}
                    {user.role === 'patient' && ['pending', 'approved'].includes(app.status) && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleStatusChange(app._id, 'cancelled')}
                      >
                        Cancel
                      </button>
                    )}

                    {/* Ongoing appointment active cabin buttons */}
                    {app.status === 'ongoing' && (
                      <>
                        <Link
                          to={`/appointments/${app._id}/call`}
                          className="btn btn-teal btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}
                        >
                          <Video size={14} />
                          <span>In Cabin (Join)</span>
                        </Link>
                        {user.role === 'doctor' && (
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
                      </>
                    )}

                    {/* Waiting/Approved appointments in queue */}
                    {app.status === 'approved' && (
                      <>
                        <Link
                          to={`/appointments/${app._id}/call`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                        >
                          <Video size={13} />
                          <span>Join Room</span>
                        </Link>
                        {user.role === 'doctor' && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => {
                              setActiveAppointment(app);
                              setIsPrescribeModalOpen(true);
                            }}
                          >
                            <FileText size={13} />
                            <span>Prescribe</span>
                          </button>
                        )}
                      </>
                    )}

                    {app.status === 'completed' && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                        ✓ Completed
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

      {/* Booking Modal (eSanjeevani Open OPD Window & Integrated UPI Payment) */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="🏥 Book OPD Consultation (eSanjeevani Model)"
      >
        <form onSubmit={handleBookAppointment}>
          <div className="form-group">
            <label className="form-label">Select Medical Department *</label>
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
            <label className="form-label">Select Specialist Doctor *</label>
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
                    Dr. {doc.user?.name} ({doc.specialization} - Fee: ₹{doc.consultationFee})
                  </option>
                ))}
            </select>
          </div>

          {/* Render Open-access OPD Timetable Window */}
          {renderWeeklyTimetable()}

          {/* Real-time Projected Token Number Banner */}
          {bookingForm.date && bookingForm.timeSlot && (() => {
            const bookedDoc = doctors.find((d) => d._id === bookingForm.doctorId);
            const docFee = bookedDoc?.consultationFee || 500;
            const projectedToken = appointments.filter(
              (a) => (a.doctor?._id === bookingForm.doctorId || a.doctor === bookingForm.doctorId) &&
                     a.date && new Date(a.date).toISOString().split('T')[0] === bookingForm.date
            ).length + 1;

            return (
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>SCHEDULED OPD SESSION</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                    {new Date(bookingForm.date).toLocaleDateString()} · {bookingForm.timeSlot}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>PROJECTED QUEUE POSITION</div>
                  <span style={{
                    background: 'var(--accent-blue)',
                    color: '#fff',
                    padding: '0.15rem 0.6rem',
                    borderRadius: '100px',
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}>
                    🎟️ Token #{projectedToken}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="form-group">
            <label className="form-label">Symptoms / Reason for Consultation *</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Describe your health symptoms, duration, or reason for visit..."
              value={bookingForm.symptoms}
              onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
              required
            />
          </div>

          {/* Mandatory Upfront Payment at Appointment Time */}
          {(() => {
            const bookedDoc = doctors.find((d) => d._id === bookingForm.doctorId);
            const docFee = bookedDoc?.consultationFee || 500;
            const tax = Math.round(docFee * 0.18);
            const totalAmount = docFee + tax;
            const projectedToken = appointments.filter(
              (a) => (a.doctor?._id === bookingForm.doctorId || a.doctor === bookingForm.doctorId) &&
                     a.date && new Date(a.date).toISOString().split('T')[0] === bookingForm.date
            ).length + 1;

            return (
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1.5px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={17} color="var(--accent-teal)" />
                    <span style={{ fontWeight: 800 }}>Mandatory Upfront Payment</span>
                  </label>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                      ₹{totalAmount}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>
                      (Fee: ₹{docFee} + 18% GST: ₹{tax})
                    </span>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(20, 184, 166, 0.08)',
                  border: '1px solid rgba(20, 184, 166, 0.25)',
                  borderRadius: '6px',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--accent-teal)',
                  marginBottom: '0.85rem'
                }}>
                  🔒 <strong>Hospital Booking Policy:</strong> Payment must be completed right now to confirm booking and generate Token #{projectedToken}. No post-consultation payment or counter queues!
                </div>

                {/* Digital Payment Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  {[
                    { id: 'UPI', label: 'Instant UPI QR Code', icon: <QrCode size={16} /> },
                    { id: 'Card', label: 'Debit / Credit Card', icon: <CreditCard size={16} /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, paymentMethod: m.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem',
                        borderRadius: '6px',
                        border: bookingForm.paymentMethod === m.id ? '1.5px solid var(--accent-teal)' : '1px solid var(--glass-border)',
                        background: bookingForm.paymentMethod === m.id ? 'rgba(20, 184, 166, 0.18)' : 'rgba(255,255,255,0.02)',
                        color: bookingForm.paymentMethod === m.id ? 'var(--accent-teal)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                {/* UPI Option Body */}
                {bookingForm.paymentMethod === 'UPI' && (
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                      <div style={{
                        background: '#fff',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        display: 'inline-block',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}>
                        <svg width="105" height="105" viewBox="0 0 100 100">
                          <rect width="100" height="100" fill="#ffffff" />
                          <rect x="10" y="10" width="26" height="26" fill="#0f172a" />
                          <rect x="14" y="14" width="18" height="18" fill="#ffffff" />
                          <rect x="18" y="18" width="10" height="10" fill="#0f172a" />
                          <rect x="64" y="10" width="26" height="26" fill="#0f172a" />
                          <rect x="68" y="14" width="18" height="18" fill="#ffffff" />
                          <rect x="72" y="18" width="10" height="10" fill="#0f172a" />
                          <rect x="10" y="64" width="26" height="26" fill="#0f172a" />
                          <rect x="14" y="68" width="18" height="18" fill="#ffffff" />
                          <rect x="18" y="72" width="10" height="10" fill="#0f172a" />
                          <rect x="42" y="10" width="6" height="6" fill="#0f172a" />
                          <rect x="52" y="10" width="6" height="6" fill="#0f172a" />
                          <rect x="42" y="24" width="6" height="12" fill="#0f172a" />
                          <rect x="42" y="44" width="16" height="16" fill="#0d9488" rx="2" />
                          <text x="50" y="56" fontSize="12" fontWeight="bold" fill="#ffffff" textAnchor="middle">₹</text>
                          <rect x="10" y="44" width="8" height="8" fill="#0f172a" />
                          <rect x="24" y="48" width="8" height="8" fill="#0f172a" />
                          <rect x="64" y="44" width="14" height="6" fill="#0f172a" />
                          <rect x="80" y="44" width="10" height="12" fill="#0f172a" />
                          <rect x="42" y="68" width="8" height="14" fill="#0f172a" />
                          <rect x="56" y="64" width="12" height="6" fill="#0f172a" />
                          <rect x="64" y="74" width="16" height="16" fill="#0f172a" />
                          <rect x="84" y="74" width="6" height="6" fill="#0f172a" />
                        </svg>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                      Scan & Pay ₹{totalAmount} with GPay, PhonePe, Paytm or BHIM
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      UPI ID: <span style={{ color: 'var(--accent-teal)' }}>carehms.opd@icici</span>
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      {bookingForm.isPaymentVerified ? (
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          padding: '0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <CheckCircle size={16} />
                          <span>Payment of ₹{totalAmount} Verified! (Ref: {bookingForm.transactionId})</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-teal btn-sm"
                          onClick={() => {
                            const mockTxn = 'UPI' + Date.now().toString().slice(-8);
                            setBookingForm({
                              ...bookingForm,
                              isPaymentVerified: true,
                              paymentStatus: 'Paid',
                              transactionId: mockTxn
                            });
                          }}
                          style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', fontWeight: 700 }}
                        >
                          ✓ Click to Pay & Verify ₹{totalAmount} (UPI)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Option Body */}
                {bookingForm.paymentMethod === 'Card' && (
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span>Credit / Debit Card or NetBanking</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-teal)' }}>Total: ₹{totalAmount}</span>
                    </div>
                    {bookingForm.isPaymentVerified ? (
                      <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle size={15} />
                        <span>Card Authorized! (Ref: {bookingForm.transactionId})</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const mockTxn = 'CARD' + Date.now().toString().slice(-8);
                          setBookingForm({
                            ...bookingForm,
                            isPaymentVerified: true,
                            paymentStatus: 'Paid',
                            transactionId: mockTxn
                          });
                        }}
                        style={{ fontWeight: 700 }}
                      >
                        💳 Pay ₹{totalAmount} via Card Checkout
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Submit Button with Upfront Payment Lock */}
          {(() => {
            const bookedDoc = doctors.find((d) => d._id === bookingForm.doctorId);
            const docFee = bookedDoc?.consultationFee || 500;
            const totalAmount = docFee + Math.round(docFee * 0.18);

            return (
              <button
                type="submit"
                disabled={!bookingForm.isPaymentVerified}
                className="btn btn-primary btn-full"
                style={{
                  padding: '0.85rem',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  background: bookingForm.isPaymentVerified ? 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' : 'rgba(255,255,255,0.08)',
                  cursor: bookingForm.isPaymentVerified ? 'pointer' : 'not-allowed',
                  opacity: bookingForm.isPaymentVerified ? 1 : 0.6
                }}
              >
                {bookingForm.isPaymentVerified
                  ? `✅ Pay ₹${totalAmount} & Confirm OPD Token`
                  : `⚠️ Pay ₹${totalAmount} Above to Confirm Appointment`}
              </button>
            );
          })()}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Clinical Notes / Diagnosis *</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.55rem',
                  color: isRecording ? '#ef4444' : 'var(--accent-teal)',
                  borderColor: isRecording ? '#ef4444' : 'var(--glass-border)'
                }}
                onClick={toggleSpeechRecognition}
              >
                <Mic size={14} style={{ animation: isRecording ? 'pulse 1s infinite' : 'none' }} />
                <span>{isRecording ? 'Listening (Speak Now)...' : 'Speech-to-Text Dictation'}</span>
              </button>
            </div>
            <textarea
              className="form-textarea"
              placeholder="Describe diagnosis, clinical advice, follow-up timelines (or click Speech-to-Text to dictate)..."
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              required
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
