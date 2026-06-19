import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_URL } from '../utils/api';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Settings, Send, PhoneCall } from 'lucide-react';

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
  
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatBottomRef = useRef(null);

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

  // Handle WebRTC Peer Connection & Socket Signaling
  useEffect(() => {
    if (loading || !appointment || !acceptedCall) return;

    // Connect to Signaling Socket Server using the dynamic backend URL
    let socketUrl = BACKEND_URL;
    try {
      socketUrl = new URL(BACKEND_URL).origin;
    } catch (e) {
      console.warn("Invalid BACKEND_URL, using as-is:", BACKEND_URL);
    }
    socketRef.current = io(socketUrl);
    
    // Initialize Local Media Streams
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setCallStatus('ready');
        
        // Connect WebRTC Peer Connection (Triggered AFTER media is ready)
        initializePeerConnection(stream);
      } catch (err) {
        console.warn('Camera/Mic permission denied or unavailable, running mock feed simulation', err);
        setCallStatus('talking'); // Mock simulation mode
        
        // Even in mock mode, join socket room to enable text chat!
        socketRef.current.emit('join-room', { roomId: id, userId: user._id, userName: user.name });
      }
    };

    startMedia();

    // Listen for incoming chat messages
    socketRef.current.on('receive-message', ({ message, senderName }) => {
      setMessages((prev) => [...prev, { text: message, sender: senderName }]);
    });

    return () => {
      cleanupMedia();
    };
  }, [id, appointment, loading, user.name, acceptedCall]);

  // Auto-scroll chat to bottom
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
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socketRef.current) {
      // If host leaves or cancels, send cancel event to patient
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

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log('Received remote track', event);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus('talking');
      }
    };

    // Handle local ICE candidates and send to peer
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { roomId: id, candidate: event.candidate });
      }
    };

    // Join room in socket signaling server ONLY AFTER media tracks are fully ready
    socketRef.current.emit('join-room', { roomId: id, userId: user._id, userName: user.name });

    // Host calls the patient
    if (isHost) {
      socketRef.current.emit('call-patient', {
        roomId: id,
        patientUserId: appointment.patient?.user?._id,
        doctorName: user.name
      });

      // Listen for call rejection from patient
      socketRef.current.on('call-rejected', () => {
        alert('The Patient rejected the call.');
        handleEndCall();
      });
    }

    // Handle peer joins
    socketRef.current.on('user-joined', async ({ userName }) => {
      console.log(`${userName} joined, initiating WebRTC negotiation`);
      setCallStatus('talking');
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('offer', { roomId: id, sdp: offer });
      } catch (err) {
        console.error('Failed to create offer', err);
      }
    });

    // Handle incoming offer
    socketRef.current.on('offer', async ({ sdp }) => {
      console.log('Received WebRTC offer');
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit('answer', { roomId: id, sdp: answer });
      } catch (err) {
        console.error('Failed to answer offer', err);
      }
    });

    // Handle incoming answer
    socketRef.current.on('answer', async ({ sdp }) => {
      console.log('Received WebRTC answer');
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Failed to set remote answer description', err);
      }
    });

    // Handle incoming ICE candidate
    socketRef.current.on('ice-candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add WebRTC ICE Candidate', err);
      }
    });

    // Handle peer leaves (when Doctor/Admin leaves, kick Patient out automatically)
    socketRef.current.on('user-left', ({ userName }) => {
      console.log(`${userName} left call`);
      if (user.role === 'patient') {
        alert('The Call has ended.');
        handleEndCall();
      } else {
        setCallStatus('ready');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      }
    });
  };

  // Send Chat Message
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

  // Toggle Mute Audio
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

  // Toggle Camera Video
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

  // End Call Session
  const handleEndCall = () => {
    cleanupMedia();
    setCallStatus('ended');
    navigate('/appointments');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Telemedicine Room...</div>;
  }

  // Styles
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
    transform: 'scaleX(-1)', // Mirror local stream
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

  const controlButtonStyle = (active, color = 'var(--bg-tertiary)') => ({
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: active ? 'var(--accent-blue)' : color,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    transition: 'var(--transition-smooth)',
  });

  return (
    <div style={pageContainerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Telemedicine Consultation Room</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Consultation with {user.role === 'patient' ? appointment.doctor?.user?.name : appointment.patient?.user?.name}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-approved" style={{ textTransform: 'uppercase' }}>
            {callStatus}
          </span>
        </div>
      </div>

      {/* Main Conference Content Layout (Videos + Chat Panel) */}
      <div style={conferenceLayout} className="conference-layout">
        
        {/* Videos Grid */}
        <div style={videoGridStyle} className="video-grid">
          {/* Local Stream view */}
          <div style={videoWrapperStyle}>
            {isCamOff ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <VideoOff size={48} style={{ marginBottom: '0.5rem' }} />
                <p>Camera is Turned Off</p>
              </div>
            ) : localStreamRef.current ? (
              <video ref={localVideoRef} autoPlay playsInline muted style={videoElementStyle} />
            ) : (
              /* Mock local video simulation */
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

          {/* Remote Stream view */}
          <div style={videoWrapperStyle}>
            {callStatus === 'ready' ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Settings size={48} className="spin-animation" style={{ marginBottom: '0.5rem', animation: 'spin 2s linear infinite' }} />
                <p>Waiting for peer to join...</p>
              </div>
            ) : !localStreamRef.current ? (
              /* Mock remote video simulation */
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

        {/* Chat Panel */}
        <div style={chatPanelStyle} className="chat-panel">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontWeight: 700, fontSize: '0.95rem' }}>
            💬 Personal Consultation Chat
          </div>

          {/* Chat Messages */}
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

          {/* Chat Input */}
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

      {/* Conference Buttons Toolbar */}
      <div style={controlsContainerStyle}>
        <button
          onClick={toggleMute}
          style={controlButtonStyle(!isMuted)}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          onClick={toggleCam}
          style={controlButtonStyle(!isCamOff)}
          title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCamOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        {isHost && (
          <button
            onClick={handleEndCall}
            style={controlButtonStyle(false, 'var(--danger)')}
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
