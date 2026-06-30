import React, { useEffect, useState, useRef } from 'react';
import { api, BACKEND_URL } from '../utils/api';
import { io } from 'socket.io-client';
import { Volume2, Play, Users, Clock, Award, Settings } from 'lucide-react';
import gsap from 'gsap';

const WaitingRoom = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastAnnouncedToken, setLastAnnouncedToken] = useState(null);
  const socketRef = useRef(null);
  
  const [voices, setVoices] = useState([]);
  const [voiceSettings, setVoiceSettings] = useState({
    voiceName: '',
    volume: 1.0,
    rate: 0.85,
    pitch: 1.05
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
        
        // Pick a default voice if none selected yet
        setVoiceSettings(prev => {
          if (prev.voiceName) return prev;
          const defaultVoice = available.find(v => v.name.includes('Google US English') || v.name.includes('Female')) || available[0];
          return {
            ...prev,
            voiceName: defaultVoice ? defaultVoice.name : ''
          };
        });
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const fetchQueueData = async () => {
    try {
      const data = await api.get('/appointments');
      
      // Filter appointments for today
      const todayStr = new Date().toISOString().split('T')[0];
      const todayApps = data.filter((app) => {
        const appDate = new Date(app.date).toISOString().split('T')[0];
        return appDate === todayStr;
      });

      setAppointments(todayApps);
    } catch (err) {
      console.error('Failed to load queue details', err);
    } finally {
      setLoading(false);
    }
  };

  // HTML5 Voice synthesis announcer
  const announceToken = (tokenNum, doctorName, deptName) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speech
      
      const isHindi = localStorage.getItem('language') === 'hn';
      const text = isHindi
        ? `टोकन नंबर ${tokenNum}. कृपया डॉक्टर ${doctorName} के केबिन में जाएं। विभाग, ${deptName}.`
        : `Token number ${tokenNum}. Please proceed to Doctor ${doctorName}. Department, ${deptName}.`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isHindi ? 'hi-IN' : 'en-US';
      utterance.volume = voiceSettings.volume;
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      
      const voicesList = window.speechSynthesis.getVoices();
      const selectedVoice = voicesList.find(v => isHindi ? v.lang.includes('hi') || v.lang.includes('IN') : v.name === voiceSettings.voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        const defaultVoice = voicesList.find(v => v.name.includes('Google US English') || v.name.includes('Female')) || voicesList[0];
        if (defaultVoice) utterance.voice = defaultVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTestSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const testText = "Testing announcer voice configuration. This is how the queue announcer will sound.";
      const utterance = new SpeechSynthesisUtterance(testText);
      utterance.volume = voiceSettings.volume;
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      
      const voicesList = window.speechSynthesis.getVoices();
      const selectedVoice = voicesList.find(v => v.name === voiceSettings.voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    fetchQueueData();

    // Connect to Signaling Socket Server
    let socketUrl = BACKEND_URL;
    try {
      socketUrl = new URL(BACKEND_URL).origin;
    } catch (e) {
      console.warn("Invalid BACKEND_URL:", BACKEND_URL);
    }
    const socket = io(socketUrl);
    socketRef.current = socket;

    // Listen for queue updates from doctors
    socket.on('queue-updated', ({ doctorId }) => {
      fetchQueueData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Check if we need to announce a newly called patient
  useEffect(() => {
    if (appointments.length === 0) return;
    
    // Find if there is an active 'ongoing' patient
    const ongoingApp = appointments.find((app) => app.status === 'ongoing');
    if (ongoingApp) {
      const tokenKey = `${ongoingApp._id}_${ongoingApp.queuePosition}`;
      if (lastAnnouncedToken !== tokenKey) {
        setLastAnnouncedToken(tokenKey);
        // Play announcement
        const docName = ongoingApp.doctor?.user?.name || 'Physician';
        const dept = ongoingApp.department?.name || 'General';
        const tokenNum = ongoingApp.queuePosition || 1;
        
        // Brief timeout to let grid update first
        setTimeout(() => {
          announceToken(tokenNum, docName, dept);
        }, 800);
      }
    }
  }, [appointments]);

  // Entrance animations on grid update
  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.queue-card',
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.1 }
      );
    }
  }, [loading, appointments]);

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#090d16', color: '#fff', fontSize: '1.2rem'
      }}>
        Loading Live Clinic Waiting Board...
      </div>
    );
  }

  // Group appointments by Doctor to display clinic-wise columns
  const doctorQueues = {};
  appointments.forEach((app) => {
    if (!app.doctor) return;
    const docId = app.doctor._id;
    if (!doctorQueues[docId]) {
      doctorQueues[docId] = {
        doctorName: app.doctor.user?.name,
        specialization: app.doctor.specialization,
        departmentName: app.department?.name || 'General',
        ongoingToken: null,
        nextTokens: [],
      };
    }
    
    if (app.status === 'ongoing') {
      doctorQueues[docId].ongoingToken = app.queuePosition;
    } else if (app.status === 'approved' || app.status === 'pending') {
      doctorQueues[docId].nextTokens.push(app.queuePosition);
    }
  });

  const doctorsList = Object.values(doctorQueues);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#05070c',
      backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(20, 184, 166, 0.08) 0%, transparent 50%)',
      padding: '2.5rem',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem', marginBottom: '2.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 30%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            🏥 CAREHMS LIVE QUEUE BROADCAST
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '1rem' }}>
            Real-time outpatient consultation board • Patient Waiting Lounge
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', backgroundColor: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.25)', borderRadius: '9999px', color: 'var(--accent-teal)' }}>
            <Volume2 size={20} className="pulse-chime" style={{ animation: 'bellPulse 2s infinite' }} />
            <span style={{ fontWeight: '700', fontSize: '0.9rem', letterSpacing: '0.05em' }}>SPEECH AUDIO ON</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              transition: 'var(--transition-smooth)',
            }}
            title="Configure Announcer Voice"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {doctorsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '8rem 2rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '18px' }}>
          <Users size={64} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Consultations Today</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', fontSize: '0.95rem' }}>
            The queue board will populate automatically as appointments are approved and called by our doctors.
          </p>
        </div>
      ) : (
        /* Queue grid board */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '2rem'
        }}>
          {doctorsList.map((doc, idx) => (
            <div
              key={idx}
              className="queue-card"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '340px'
              }}
            >
              {/* Doctor Details */}
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff' }}>{doc.doctorName}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-teal)', marginTop: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {doc.specialization} • {doc.departmentName}
                </p>
              </div>

              {/* Active Token Call Box */}
              <div style={{
                backgroundColor: doc.ongoingToken ? 'rgba(20, 184, 166, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${doc.ongoingToken ? 'rgba(20, 184, 166, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center',
                margin: '1.5rem 0',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Now Serving / सक्रिय टोकन
                </span>
                <span style={{
                  fontSize: '4.8rem',
                  fontWeight: 900,
                  color: doc.ongoingToken ? 'var(--accent-teal)' : 'var(--text-muted)',
                  fontFamily: 'monospace',
                  display: 'block',
                  lineHeight: 1,
                  textShadow: doc.ongoingToken ? '0 0 25px rgba(20, 184, 166, 0.4)' : 'none'
                }}>
                  {doc.ongoingToken ? `#${doc.ongoingToken}` : 'WAITING'}
                </span>
              </div>

              {/* Next queue slots list */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Next in Queue / अगले कतार में:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  {doc.nextTokens.length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>None remaining</span>
                  ) : (
                    doc.nextTokens.slice(0, 5).map((tok, index) => (
                      <span
                        key={index}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#f8fafc',
                          fontFamily: 'monospace'
                        }}
                      >
                        #{tok}
                      </span>
                    ))
                  )}
                  {doc.nextTokens.length > 5 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      +{doc.nextTokens.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes bellPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Settings Configuration Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            color: '#fff'
          }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--accent-teal)' }}>
              Announcer Voice Settings
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              Adjust Speech Synthesis narrator settings for token broadcasts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Voice Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Voice / आवाज़ चुनें
                </label>
                <select
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                  value={voiceSettings.voiceName}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, voiceName: e.target.value })}
                >
                  {voices.map((voice, idx) => (
                    <option key={idx} value={voice.name} style={{ backgroundColor: '#1e293b', color: '#fff' }}>
                      {voice.name} (${voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Volume Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Volume: {Math.round(voiceSettings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  style={{ accentColor: 'var(--accent-teal)', height: '6px', borderRadius: '3px' }}
                  value={voiceSettings.volume}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, volume: parseFloat(e.target.value) })}
                />
              </div>

              {/* Speed/Rate Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Speed / Rate: {voiceSettings.rate}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  style={{ accentColor: 'var(--accent-teal)', height: '6px', borderRadius: '3px' }}
                  value={voiceSettings.rate}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, rate: parseFloat(e.target.value) })}
                />
              </div>

              {/* Pitch Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Pitch: {voiceSettings.pitch}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  style={{ accentColor: 'var(--accent-teal)', height: '6px', borderRadius: '3px' }}
                  value={voiceSettings.pitch}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, pitch: parseFloat(e.target.value) })}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-teal"
                  style={{ flex: 1, padding: '0.6rem' }}
                  onClick={handleTestSpeech}
                >
                  Test Speech
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.6rem' }}
                  onClick={() => setShowSettings(false)}
                >
                  Save & Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitingRoom;
