import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_URL } from '../utils/api';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Settings, Send, Edit, Trash, FileText, X } from 'lucide-react';
import gsap from 'gsap';
import { sendMockWhatsapp } from '../utils/whatsapp';

const CallRoom = () => {
  const { id } = useParams(); // Appointment ID
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Audio/Video control states
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, ready, talking, ended
  
  // Chat States
  const [messages, setMessages] = useState([]);
  const [typedText, setTypedText] = useState('');
  
  // Accepted call is true since Patient accepts from the global popup modal
  const [acceptedCall] = useState(true);
  
  // Hosts are doctors or admins
  const isHost = user?.role === 'doctor' || user?.role === 'admin';
  
  // Stream states to solve conditional rendering ref-binding issues
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Collaborative Whiteboard Canvas states
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [brushColor, setBrushColor] = useState('#3b82f6');
  const [brushWidth, setBrushWidth] = useState(3);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Doctor In-call Prescription states
  const [showPrescriptionDrawer, setShowPrescriptionDrawer] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    diagnosis: '',
    notes: '',
    medicines: [{ name: '', dosage: '', frequency: '' }]
  });

  const [isDictating, setIsDictating] = useState(false);

  const handleDictate = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation (SpeechRecognition API) is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = () => setIsDictating(false);
    
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setPrescriptionForm(prev => ({
        ...prev,
        notes: prev.notes ? `${prev.notes} ${text}` : text
      }));
    };
    
    recognition.start();
  };

  // Load appointment details
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const data = await api.get('/appointments');
        const match = data.find((a) => a._id === id);
        if (!match) {
          alert('Appointment room not found');
          navigate('/dashboard');
          return;
        }
        setAppointment(match);
      } catch (err) {
        console.error('Failed to load appointment details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [id, navigate]);

  // Entrance animations
  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.video-grid > div',
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.15 }
      );
      gsap.fromTo('.chat-panel',
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.2 }
      );
      gsap.fromTo('.controls-container-toolbar button',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.8)', stagger: 0.1, delay: 0.4 }
      );
    }
  }, [loading]);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus, isCamOff]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  // Canvas Stroke Drawer
  const drawOnCanvas = (x0, y0, x1, y1, color, width, emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    if (emit && socketRef.current) {
      socketRef.current.emit('whiteboard-draw', {
        roomId: id,
        drawData: { x0, y0, x1, y1, color, width }
      });
    }
  };

  // Handle WebRTC signaling & sockets
  useEffect(() => {
    if (loading || !appointment || !acceptedCall) return;

    let socketUrl = BACKEND_URL;
    try {
      socketUrl = new URL(BACKEND_URL).origin;
    } catch (e) {
      console.warn("Invalid BACKEND_URL, using as-is:", BACKEND_URL);
    }
    socketRef.current = io(socketUrl);
    
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCallStatus('ready');
        
        initializePeerConnection(stream);
      } catch (err) {
        console.warn('Camera/Mic permission denied or unavailable, running mock feed simulation', err);
        setCallStatus('talking');
        socketRef.current.emit('join-room', { roomId: id, userId: user._id, userName: user.name });
      }
    };

    startMedia();

    // Sockets Chat listener
    socketRef.current.on('receive-message', ({ message, senderName }) => {
      setMessages((prev) => [...prev, { text: message, sender: senderName }]);
    });

    // Sockets Whiteboard listener
    socketRef.current.on('whiteboard-draw', ({ drawData }) => {
      drawOnCanvas(drawData.x0, drawData.y0, drawData.x1, drawData.y1, drawData.color, drawData.width, false);
    });

    return () => {
      cleanupMedia();
    };
  }, [id, appointment, loading, user.name, acceptedCall]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socketRef.current) {
      if (isHost) {
        socketRef.current.emit('cancel-call', { roomId: id, patientUserId: appointment?.patient?.user?._id });
      }
      socketRef.current.emit('leave-room', { roomId: id, userName: user.name });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const initializePeerConnection = (stream) => {
    const config = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };
    
    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setCallStatus('talking');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { roomId: id, candidate: event.candidate });
      }
    };

    socketRef.current.emit('join-room', { roomId: id, userId: user._id, userName: user.name });

    if (isHost) {
      socketRef.current.emit('call-patient', {
        roomId: id,
        patientUserId: appointment.patient?.user?._id,
        doctorName: user.name
      });

      socketRef.current.on('call-rejected', () => {
        alert('The Patient rejected the call.');
        handleEndCall();
      });
    }

    socketRef.current.on('user-joined', async ({ userName }) => {
      setCallStatus('talking');
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('offer', { roomId: id, sdp: offer });
      } catch (err) {
        console.error('Failed to create offer', err);
      }
    });

    socketRef.current.on('offer', async ({ sdp }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit('answer', { roomId: id, sdp: answer });
      } catch (err) {
        console.error('Failed to answer offer', err);
      }
    });

    socketRef.current.on('answer', async ({ sdp }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Failed to set remote answer description', err);
      }
    });

    socketRef.current.on('ice-candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add WebRTC ICE Candidate', err);
      }
    });

    socketRef.current.on('user-left', ({ userName }) => {
      if (user.role === 'patient') {
        alert('The Call has ended.');
        handleEndCall();
      } else {
        setCallStatus('ready');
        setRemoteStream(null);
      }
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedText.trim()) return;

    if (socketRef.current) {
      socketRef.current.emit('send-message', {
        roomId: id,
        message: typedText,
        senderName: user.name,
      });
      setMessages((prev) => [...prev, { text: typedText, sender: 'You' }]);
      setTypedText('');
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    } else {
      setIsMuted(!isMuted);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    } else {
      setIsCamOff(!isCamOff);
    }
  };

  const handleEndCall = () => {
    cleanupMedia();
    setCallStatus('ended');
    navigate('/appointments');
  };

  // Canvas Mouse Draw handlers
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    lastPosRef.current = { x, y };
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawOnCanvas(lastPosRef.current.x, lastPosRef.current.y, x, y, brushColor, brushWidth);
    lastPosRef.current = { x, y };
  };

  const handleMouseUpOrLeave = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // In-call Prescription Submit handler
  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patient: appointment.patient?._id,
        doctor: appointment.doctor?._id,
        appointment: appointment._id,
        diagnosis: prescriptionForm.diagnosis,
        notes: prescriptionForm.notes,
        medicines: prescriptionForm.medicines.filter(m => m.name)
      };

      await api.post('/prescriptions', payload);
      sendMockWhatsapp(`💊 *[AS HOSPITAL]* New Prescription Issued!\nDear Patient, Dr. ${user.name} has generated your Rx prescription. You can view it here: http://localhost:5173/prescriptions`);
      alert('Prescription issued successfully!');
      setShowPrescriptionDrawer(false);
      setPrescriptionForm({
        diagnosis: '',
        notes: '',
        medicines: [{ name: '', dosage: '', frequency: '' }]
      });

      // Notify in chat automatically
      if (socketRef.current) {
        socketRef.current.emit('send-message', {
          roomId: id,
          message: `📋 [Rx System Alert] Dr. ${user.name} has issued an online prescription. Check your inbox.`,
          senderName: 'System'
        });
        setMessages((prev) => [...prev, { text: `📋 [Rx System Alert] Dr. ${user.name} has issued an online prescription. Check your inbox.`, sender: 'System' }]);
      }
    } catch (err) {
      alert(err.message || 'Failed to issue prescription');
    }
  };

  const handleAddMedicineRow = () => {
    setPrescriptionForm({
      ...prescriptionForm,
      medicines: [...prescriptionForm.medicines, { name: '', dosage: '', frequency: '' }]
    });
  };

  if (loading || !appointment) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Telemedicine Room...</div>;
  }

  const pageContainerStyle = {
    minHeight: 'calc(100vh - 120px)',
    backgroundColor: '#090d16',
    borderRadius: 'var(--border-radius-lg)',
    border: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.75rem',
    zIndex: 10,
  };

  const conferenceLayout = {
    flex: 1,
    display: 'flex',
    gap: '1.5rem',
    minHeight: '400px',
    zIndex: 5,
    position: 'relative'
  };

  const videoGridStyle = {
    flex: 2,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  };

  const chatPanelStyle = {
    flex: 0.8,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--border-radius)',
    overflow: 'hidden',
  };

  const videoWrapperStyle = {
    position: 'relative',
    backgroundColor: '#151b26',
    borderRadius: 'var(--border-radius)',
    border: '1px solid var(--glass-border)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const videoElementStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  };

  const labelOverlayStyle = {
    position: 'absolute',
    bottom: '1rem',
    left: '1rem',
    backgroundColor: 'rgba(9, 13, 22, 0.75)',
    padding: '0.4rem 0.8rem',
    borderRadius: 'var(--border-radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const controlsContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
    marginTop: '1.5rem',
    zIndex: 10,
  };

  return (
    <div style={pageContainerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Telemedicine Consultation Room</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Consultation with {user.role === 'patient' ? appointment.doctor?.user?.name : appointment.patient?.user?.name}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isHost && (
            <button 
              onClick={() => setShowPrescriptionDrawer(true)} 
              className="btn btn-teal btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FileText size={14} />
              <span>Issue Prescription</span>
            </button>
          )}
          <button 
            onClick={() => setShowWhiteboard(!showWhiteboard)} 
            className={`btn ${showWhiteboard ? 'btn-teal' : 'btn-secondary'} btn-sm`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Edit size={14} />
            <span>{showWhiteboard ? 'Hide Board' : 'Show Whiteboard'}</span>
          </button>
          <span className="badge badge-approved" style={{ textTransform: 'uppercase' }}>
            {callStatus}
          </span>
        </div>
      </div>

      <div style={conferenceLayout} className="conference-layout">
        
        {/* Collaborative Canvas whiteboard Overlay */}
        {showWhiteboard && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700 }}>Interactive Collaborative Whiteboard</span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Brush Width Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Size:</span>
                  <select 
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', fontSize: '0.8rem', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#fff' }}
                    value={brushWidth} 
                    onChange={(e) => setBrushWidth(Number(e.target.value))}
                  >
                    <option value="2">2px</option>
                    <option value="4">4px</option>
                    <option value="6">6px</option>
                  </select>
                </div>

                {/* Color select palette */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {['#3b82f6', '#10b981', '#ffffff', '#f43f5e', '#f59e0b'].map(col => (
                    <button 
                      key={col} 
                      onClick={() => setBrushColor(col)} 
                      style={{
                        width: '20px', height: '20px', borderRadius: '50%', backgroundColor: col, border: brushColor === col ? '2px solid #fff' : 'none', cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>

                <button onClick={clearCanvas} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Trash size={12} /> Clear
                </button>

                <button onClick={() => setShowWhiteboard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Drawing Canvas */}
            <canvas
              ref={canvasRef}
              width="800"
              height="350"
              style={{
                flex: 1,
                background: '#0f172a',
                borderRadius: 'var(--border-radius)',
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'crosshair',
                width: '100%'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            />
          </div>
        )}

        {/* Video stream viewports */}
        <div style={videoGridStyle} className="video-grid">
          <div style={videoWrapperStyle}>
            {isCamOff ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <VideoOff size={48} style={{ marginBottom: '0.5rem' }} />
                <p>Camera is Turned Off</p>
              </div>
            ) : localStream ? (
              <video ref={localVideoRef} autoPlay playsInline muted style={videoElementStyle} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', marginBottom: '1rem' }}>
                  <User size={36} />
                </div>
                <p style={{ fontWeight: 600 }}>{user.name} (You)</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mock Local Video Stream</span>
              </div>
            )}
            <div style={labelOverlayStyle}>
              <span>{user.name} (You)</span>
              {isMuted && <MicOff size={14} style={{ color: 'var(--danger)' }} />}
            </div>
          </div>

          <div style={videoWrapperStyle}>
            {callStatus === 'ready' ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Settings size={48} className="spin-animation" style={{ marginBottom: '0.5rem', animation: 'spin 2s linear infinite' }} />
                <p>Waiting for peer to join...</p>
              </div>
            ) : !remoteStream ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(20, 184, 166, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)', marginBottom: '1rem' }}>
                  <User size={36} />
                </div>
                <p style={{ fontWeight: 600 }}>
                  {user.role === 'patient' ? appointment.doctor?.user?.name : appointment.patient?.user?.name}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-teal)' }}>Connected • Mock Video Stream</span>
              </div>
            ) : (
              <video ref={remoteVideoRef} autoPlay playsInline style={videoElementStyle} />
            )}
            <div style={labelOverlayStyle}>
              <span>{user.role === 'patient' ? appointment.doctor?.user?.name : appointment.patient?.user?.name}</span>
            </div>
          </div>
        </div>

        {/* Messaging box */}
        <div style={chatPanelStyle} className="chat-panel">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontWeight: 700, fontSize: '0.95rem' }}>
            💬 Personal Consultation Chat
          </div>

          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
                No messages yet. Send a message to start chat.
              </div>
            ) : (
              messages.map((msg, i) => {
                const isSelf = msg.sender === 'You';
                return (
                  <div key={i} style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    {!isSelf && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.15rem' }}>
                        {msg.sender}
                      </span>
                    )}
                    <div style={{
                      padding: '0.6rem 0.9rem',
                      borderRadius: 'var(--border-radius)',
                      fontSize: '0.9rem',
                      backgroundColor: isSelf ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                      color: '#fff',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '0.75rem', borderTop: '1px solid var(--glass-border)', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ margin: 0, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              placeholder="Type your message..."
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Slide-out Doctor Prescription Drawer */}
      {showPrescriptionDrawer && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px',
          backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--glass-border)',
          zIndex: 300, display: 'flex', flexDirection: 'column', padding: '2rem',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-teal)' }}>📋 Issue Rx Prescription</h3>
            <button onClick={() => setShowPrescriptionDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handlePrescriptionSubmit}>
            <div className="form-group">
              <label className="form-label">Clinical Diagnosis *</label>
              <textarea 
                className="form-textarea" 
                rows="2"
                placeholder="Enter diagnosis (e.g. Viral Fever)..." 
                value={prescriptionForm.diagnosis}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                required
              />

              {/* ICD-10 Autocomplete code matched helper */}
              {(() => {
                const icd10Codes = [
                  { code: 'J06', desc: 'Acute Upper Respiratory Infection' },
                  { code: 'I10', desc: 'Essential Hypertension' },
                  { code: 'E11', desc: 'Type 2 Diabetes Mellitus' },
                  { code: 'M79', desc: 'Fibromyalgia' },
                  { code: 'N39', desc: 'Urinary Tract Infection' }
                ];
                const query = prescriptionForm.diagnosis.toLowerCase().trim();
                const matched = query ? icd10Codes.filter(c => c.desc.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)) : [];
                if (matched.length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                    {matched.map(c => (
                      <span key={c.code} 
                        onClick={() => setPrescriptionForm({ ...prescriptionForm, diagnosis: `${c.code} (${c.desc})` })}
                        style={{
                          fontSize: '0.7rem', backgroundColor: 'rgba(2, 132, 199, 0.15)',
                          color: 'var(--accent-blue)', padding: '0.2rem 0.5rem', borderRadius: '4px',
                          border: '1px solid var(--accent-blue)', cursor: 'pointer'
                        }}
                      >
                        🏷️ {c.code} - {c.desc}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="form-group">
              <label className="form-label">Medicines & Prescribed Dosage *</label>
              {prescriptionForm.medicines.map((med, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Medicine Name"
                    className="form-input"
                    style={{ margin: 0, fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    value={med.name}
                    onChange={(e) => {
                      const updated = [...prescriptionForm.medicines];
                      updated[idx].name = e.target.value;
                      setPrescriptionForm({ ...prescriptionForm, medicines: updated });
                    }}
                    required={idx === 0}
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 1-0-1)"
                    className="form-input"
                    style={{ margin: 0, fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    value={med.dosage}
                    onChange={(e) => {
                      const updated = [...prescriptionForm.medicines];
                      updated[idx].dosage = e.target.value;
                      setPrescriptionForm({ ...prescriptionForm, medicines: updated });
                    }}
                  />
                </div>
              ))}
              <button 
                type="button" 
                onClick={handleAddMedicineRow}
                className="btn btn-secondary btn-sm btn-full"
                style={{ fontSize: '0.75rem', padding: '0.3rem', marginTop: '0.4rem' }}
              >
                + Add Another Medicine
              </button>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Special Advice / Notes</span>
                <button
                  type="button"
                  onClick={handleDictate}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: isDictating ? 'var(--danger)' : 'var(--accent-blue)',
                    fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem'
                  }}
                  title="Dictate voice speech notes"
                >
                  🎙️ {isDictating ? 'Listening...' : 'Dictate'}
                </button>
              </label>
              <textarea 
                className="form-textarea" 
                rows="3"
                placeholder="Special precautions, follow-up advice..."
                value={prescriptionForm.notes}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
              />
            </div>

            {/* Drug-to-Drug warning trigger */}
            {(() => {
              const meds = prescriptionForm.medicines.map(m => m.name.toLowerCase().trim());
              const hasAspirin = meds.includes('aspirin');
              const hasIbuprofen = meds.includes('ibuprofen');
              if (hasAspirin && hasIbuprofen) {
                return (
                  <div style={{
                    background: 'rgba(225, 29, 72, 0.12)', border: '1px solid var(--danger)',
                    borderRadius: 'var(--border-radius-sm)', padding: '0.6rem 0.8rem',
                    marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 'bold'
                  }}>
                    ⚠️ DRUG WARNING: Combining Aspirin & Ibuprofen increases mucosal damage and bleeding risks.
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className="btn btn-teal btn-full">Issue & Send Rx</button>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowPrescriptionDrawer(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Action panel bar */}
      <div style={controlsContainerStyle} className="controls-container-toolbar">
        <button
          onClick={toggleMute}
          className={`control-btn ${!isMuted ? 'active-blue' : ''}`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          onClick={toggleCam}
          className={`control-btn ${!isCamOff ? 'active-blue' : ''}`}
          title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCamOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        {isHost && (
          <button
            onClick={handleEndCall}
            className="control-btn danger"
            title="End Telemedicine Call"
          >
            <PhoneOff size={24} />
          </button>
        )}
      </div>

      <style>{`
        .spin-animation {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 992px) {
          .conference-layout {
            flex-direction: column !important;
          }
          .chat-panel {
            min-height: 250px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CallRoom;
