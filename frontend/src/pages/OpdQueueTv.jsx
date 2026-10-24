import React, { useState, useEffect, useRef } from 'react';
import { api, BACKEND_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Tv,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  User,
  Clock,
  ArrowRight,
  CheckCircle,
  Bell,
  Stethoscope,
  Activity,
  Calendar,
  Sparkles,
} from 'lucide-react';

const OpdQueueTv = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceAnnouncement, setVoiceAnnouncement] = useState(true);
  const [lastAnnouncedToken, setLastAnnouncedToken] = useState(null);

  // Digital clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch doctors list
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const docs = await api.get('/doctors');
        setDoctors(docs);
        if (docs.length > 0) {
          // If logged in as doctor, preselect this doctor
          if (user?.role === 'doctor') {
            const myDoc = docs.find((d) => d.user?._id === user._id || d.user === user._id);
            if (myDoc) {
              setSelectedDoctorId(myDoc._id);
              return;
            }
          }
          setSelectedDoctorId(docs[0]._id);
        }
      } catch (err) {
        console.error('Failed to load doctors for TV queue', err);
      }
    };
    loadDoctors();
  }, [user]);

  // Fetch appointments for selected doctor
  const fetchDoctorAppointments = async (docId) => {
    const targetDocId = docId || selectedDoctorId;
    if (!targetDocId) return;

    try {
      // Get today's start and end date
      const todayStr = new Date().toISOString().split('T')[0];
      const data = await api.get(`/appointments?doctorId=${targetDocId}&startDate=${todayStr}`);
      
      // Filter for this doctor & today
      const docApps = data.filter((a) => {
        const aDocId = a.doctor?._id || a.doctor;
        return aDocId === targetDocId;
      });

      setAppointments(docApps);
    } catch (err) {
      console.error('Failed to fetch doctor appointments for TV board', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId) {
      setLoading(true);
      fetchDoctorAppointments(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  // Socket.io Real-time Queue Updates & Polling
  useEffect(() => {
    let socketUrl = BACKEND_URL;
    try {
      socketUrl = new URL(BACKEND_URL).origin;
    } catch (e) {
      console.warn('Invalid BACKEND_URL', BACKEND_URL);
    }

    const socket = io(socketUrl);
    socket.on('queue-updated', ({ doctorId }) => {
      if (!doctorId || doctorId === selectedDoctorId) {
        fetchDoctorAppointments(selectedDoctorId);
      }
    });

    const pollInterval = setInterval(() => {
      if (selectedDoctorId) {
        fetchDoctorAppointments(selectedDoctorId);
      }
    }, 8000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [selectedDoctorId]);

  // Audio Chime Generator via Web Audio API
  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio chime playback issue:', e);
    }
  };

  // Voice Announcement via Browser SpeechSynthesis
  const speakTokenAnnouncement = (tokenNum, patientName, cabinNumber = 'Cabin 1') => {
    playChimeSound();
    if (!voiceAnnouncement || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setTimeout(() => {
      const text = `Token number ${tokenNum}. Patient ${patientName}, please proceed to ${cabinNumber}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }, 400);
  };

  // Identify current ongoing patient and waiting queue
  const currentDoctorObj = doctors.find((d) => d._id === selectedDoctorId);
  const activeOngoing = appointments.find((a) => a.status === 'ongoing');
  const waitingPatients = appointments
    .filter((a) => a.status === 'approved' || a.status === 'pending')
    .sort((a, b) => {
      const serialA = a.serialNumber || 999;
      const serialB = b.serialNumber || 999;
      return serialA - serialB;
    });

  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  // Handle Next Patient Click
  const handleCallNextPatient = async () => {
    if (waitingPatients.length === 0) {
      alert('No more waiting patients in queue for today!');
      return;
    }

    const nextPatient = waitingPatients[0];
    const tokenNum = nextPatient.serialNumber || 1;
    const patName = nextPatient.patient?.user?.name || 'Patient';

    try {
      // 1. If someone was currently ongoing, mark them completed
      if (activeOngoing) {
        await api.put(`/appointments/${activeOngoing._id}/status`, { status: 'completed' });
      }

      // 2. Mark next patient as ongoing
      await api.put(`/appointments/${nextPatient._id}/status`, { status: 'ongoing' });

      // 3. Play chime & voice announcement
      speakTokenAnnouncement(tokenNum, patName, currentDoctorObj?.department?.name ? `${currentDoctorObj.department.name} OPD` : 'OPD Cabin 1');
      setLastAnnouncedToken(tokenNum);

      // 4. Refresh data
      await fetchDoctorAppointments(selectedDoctorId);
    } catch (err) {
      alert(err.message || 'Failed to call next patient');
    }
  };

  // Recall current patient
  const handleRecallCurrent = () => {
    if (!activeOngoing) {
      if (waitingPatients.length > 0) {
        handleCallNextPatient();
      }
      return;
    }
    const tokenNum = activeOngoing.serialNumber || 1;
    const patName = activeOngoing.patient?.user?.name || 'Patient';
    speakTokenAnnouncement(tokenNum, patName, currentDoctorObj?.department?.name ? `${currentDoctorObj.department.name} OPD` : 'OPD Cabin 1');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.warn(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((e) => console.warn(e));
        setIsFullscreen(false);
      }
    }
  };

  // Calculate estimated turn time: e.g. average 15 mins per patient
  const getEstimatedWaitTime = (index) => {
    const minsPerPatient = 15;
    const totalMinutes = (index + 1) * minsPerPatient;
    const arrivalDate = new Date(currentTime.getTime() + totalMinutes * 60000);
    const timeFormatted = arrivalDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (index === 0) {
      return {
        text: `Next In Line (~${minsPerPatient} mins)`,
        exact: timeFormatted,
        isNext: true,
      };
    }

    return {
      text: `In ~${totalMinutes} mins`,
      exact: `Expected around ${timeFormatted}`,
      isNext: false,
    };
  };

  return (
    <div
      style={{
        backgroundColor: '#090d16',
        color: '#f8fafc',
        minHeight: '100vh',
        padding: '1.25rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Top TV Screen Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '0.85rem 1.5rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
            }}
          >
            <Tv size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.5px', color: '#fff' }}>
              🏥 AS MULTISPECIALTY HOSPITAL
            </div>
            <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '1px' }}>
              LIVE OPD QUEUE & TOKEN DISPLAY SYSTEM
            </div>
          </div>
        </div>

        {/* Doctor Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Doctor Cabin:</span>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.45rem 0.8rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.user?.name || 'Doctor'} ({d.specialization || 'OPD'})
                </option>
              ))}
            </select>
          </div>

          {/* Sound & Voice Controls */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${soundEnabled ? '#10b981' : '#ef4444'}`,
              color: soundEnabled ? '#10b981' : '#ef4444',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
            title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Bell ON' : 'Muted'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              backgroundColor: '#3b82f6',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>{isFullscreen ? 'Exit TV Mode' : '⛶ Fullscreen TV'}</span>
          </button>

          {/* Digital Clock */}
          <div
            style={{
              backgroundColor: '#020617',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '0.4rem 0.9rem',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '1px' }}>
              {currentTime.toLocaleTimeString('en-IN')}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Screen TV Display */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(380px, 4.2fr) minmax(420px, 5.8fr)',
          gap: '1.5rem',
          flex: 1,
        }}
      >
        {/* LEFT COLUMN: NOW SERVING / IN CONSULTATION */}
        <div
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #111e38 100%)',
            border: '2px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '16px',
            padding: '1.8rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 12px 36px rgba(14, 165, 233, 0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient Glow in background */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              filter: 'blur(50px)',
              pointerEvents: 'none',
            }}
          />

          <div>
            {/* Cabin & Doctor Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <span
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                  }}
                >
                  OPD CABIN • ROOM 102
                </span>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: '0.6rem 0 0.2rem 0' }}>
                  Dr. {currentDoctorObj?.user?.name || 'Doctor On Duty'}
                </h2>
                <div style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 600 }}>
                  {currentDoctorObj?.specialization || 'General Physician'} • {currentDoctorObj?.department?.name || 'Clinical Wing'}
                </div>
              </div>

              {/* Status Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: activeOngoing ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  border: `1px solid ${activeOngoing ? '#10b981' : '#eab308'}`,
                  color: activeOngoing ? '#10b981' : '#eab308',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: activeOngoing ? '#10b981' : '#eab308',
                    boxShadow: activeOngoing ? '0 0 10px #10b981' : 'none',
                  }}
                />
                <span>{activeOngoing ? 'IN CONSULTATION' : 'WAITING FOR NEXT'}</span>
              </div>
            </div>

            {/* BIG TOKEN & PATIENT DISPLAY BOX */}
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 800, letterSpacing: '2px', marginBottom: '0.5rem' }}>
                CURRENT TOKEN NUMBER
              </div>

              {/* Giant Token Serial Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '220px',
                  height: '140px',
                  background: activeOngoing
                    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                    : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  borderRadius: '24px',
                  border: activeOngoing ? '3px solid #38bdf8' : '2px solid rgba(255,255,255,0.1)',
                  boxShadow: activeOngoing ? '0 0 35px rgba(56, 189, 248, 0.45)' : 'none',
                  color: '#fff',
                  fontSize: '4.8rem',
                  fontWeight: 900,
                  letterSpacing: '-2px',
                  padding: '0 2rem',
                }}
              >
                #{activeOngoing?.serialNumber ? String(activeOngoing.serialNumber).padStart(2, '0') : '--'}
              </div>

              {/* Patient Name in bold large letters */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {activeOngoing?.patient?.user?.name || (waitingPatients.length > 0 ? 'Ready To Call' : 'No Patients Remaining')}
                </div>
                <div style={{ fontSize: '1rem', color: '#38bdf8', fontWeight: 700, marginTop: '0.35rem' }}>
                  {activeOngoing?.patient?.patientId ? `Medical ID: ${activeOngoing.patient.patientId}` : 'Please press "Call Next Patient"'}
                </div>
              </div>

              {/* Symptoms / Details badge */}
              {activeOngoing?.symptoms && (
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.4rem 1rem',
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    marginTop: '1rem',
                  }}
                >
                  Consultation Purpose: <strong style={{ color: '#fff' }}>{activeOngoing.symptoms}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Controls Bar for Doctor / Desk Nurse */}
          <div
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={handleCallNextPatient}
              disabled={waitingPatients.length === 0}
              style={{
                flex: 1.5,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: waitingPatients.length === 0 ? 'not-allowed' : 'pointer',
                opacity: waitingPatients.length === 0 ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              <span>Call Next Patient</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={handleRecallCurrent}
              style={{
                flex: 1,
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <Bell size={16} />
              <span>Recall Token 🔔</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: WAITING PATIENTS QUEUE LIST */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Queue Header with Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '0.9rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                ⏳ UPCOMING WAITING QUEUE (Order of Turn)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Estimated arrival times calculated at ~15 mins per patient consultation
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span
                style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  color: '#eab308',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                }}
              >
                Waiting: {waitingPatients.length}
              </span>
              <span
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                Completed: {completedCount}
              </span>
            </div>
          </div>

          {/* Queue Items List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxHeight: 'calc(100vh - 270px)',
              paddingRight: '0.25rem',
            }}
          >
            {waitingPatients.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: '#64748b',
                }}
              >
                <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Queue Cleared!</div>
                <p style={{ fontSize: '0.88rem', margin: '0.4rem 0 0 0' }}>
                  All scheduled patient consultations for this doctor are completed.
                </p>
              </div>
            ) : (
              waitingPatients.map((patientApp, idx) => {
                const waitEst = getEstimatedWaitTime(idx);
                const tokenNum = patientApp.serialNumber || idx + 1;

                return (
                  <div
                    key={patientApp._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: waitEst.isNext ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: waitEst.isNext ? '1.5px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '0.85rem 1.15rem',
                      gap: '1rem',
                      transition: 'all 0.2s ease',
                      boxShadow: waitEst.isNext ? '0 0 20px rgba(14, 165, 233, 0.15)' : 'none',
                    }}
                  >
                    {/* Left: Token Serial & Patient Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '12px',
                          background: waitEst.isNext
                            ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                            : 'rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.4rem',
                          fontWeight: 900,
                          letterSpacing: '-0.5px',
                          border: waitEst.isNext ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                          flexShrink: 0,
                        }}
                      >
                        #{String(tokenNum).padStart(2, '0')}
                      </div>

                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                          {patientApp.patient?.user?.name || 'Patient'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                            {patientApp.patient?.patientId || 'PID-XXXX'}
                          </span>
                          <span>•</span>
                          <span>Slot: {patientApp.timeSlot || 'OPD'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Estimated Wait Time & Status */}
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          color: waitEst.isNext ? '#38bdf8' : '#e2e8f0',
                        }}
                      >
                        {waitEst.text}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: waitEst.isNext ? '#7dd3fc' : '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>
                        {waitEst.exact}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Running Ticker / Announcement Bar */}
          <div
            style={{
              backgroundColor: '#020617',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginTop: '1rem',
              fontSize: '0.8rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: '#f59e0b', fontWeight: 800 }}>📢 NOTICE:</span>
            <span>
              Please keep your Appointment Slip & Patient ID ready. Patients arriving after their token is called will be placed in the priority buffer queue.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpdQueueTv;
