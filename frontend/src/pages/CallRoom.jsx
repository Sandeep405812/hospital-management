import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Settings } from 'lucide-react';

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
  
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
    if (loading || !appointment) return;

    // Connect to Signaling Socket Server
    socketRef.current = io('http://localhost:5000');
    
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
        
        // Connect WebRTC Peer Connection
        initializePeerConnection(stream);
      } catch (err) {
        console.warn('Camera/Mic permission denied or unavailable, running mock feed simulation', err);
        setCallStatus('talking'); // Mock simulation mode
      }
    };

    startMedia();

    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId: id, userName: user.name });
        socketRef.current.disconnect();
      }
    };
  }, [id, appointment, loading, user.name]);

  const initializePeerConnection = (stream) => {
    // Standard STUN servers configuration
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
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', { roomId: id, candidate: event.candidate });
      }
    };

    // Join room in socket signaling server
    socketRef.current.emit('join-room', { roomId: id, userId: user._id, userName: user.name });

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

    // Handle peer leaves
    socketRef.current.on('user-left', ({ userName }) => {
      console.log(`${userName} left call`);
      setCallStatus('ready');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });
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
      setIsMuted(!isMuted); // Mock fallback toggle
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
      setIsCamOff(!isCamOff); // Mock fallback toggle
    }
  };

  // End Call Session
  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      navigate('/appointments');
    }, 1000);
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

  const videoGridStyle = {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    minHeight: '400px',
    zIndex: 5,
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
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifycontent: 'center', color: 'var(--accent-blue)', marginBottom: '1rem' }}>
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
              <p>Waiting for peer to join the consultation...</p>
            </div>
          ) : !localStreamRef.current ? (
            /* Mock remote video simulation */
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(20, 184, 166, 0.2)', display: 'flex', alignItems: 'center', justifycontent: 'center', color: 'var(--accent-teal)', marginBottom: '1rem' }}>
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

        <button
          onClick={handleEndCall}
          style={controlButtonStyle(false, 'var(--danger)')}
          title="End Telemedicine Call"
        >
          <PhoneOff size={24} />
        </button>
      </div>

      <style>{`
        .spin-animation {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CallRoom;
