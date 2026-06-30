import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Trash2, ShieldCheck } from 'lucide-react';

const WhatsappSimulator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Load existing messages
    const saved = JSON.parse(localStorage.getItem('whatsapp_simulator_messages') || '[]');
    setMessages(saved);

    // Listen for new messages
    const handleMsg = (e) => {
      setMessages((prev) => [...prev, e.detail]);
    };
    window.addEventListener('whatsapp-message', handleMsg);
    return () => window.removeEventListener('whatsapp-message', handleMsg);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleClear = () => {
    localStorage.removeItem('whatsapp_simulator_messages');
    setMessages([]);
  };

  const bubbleStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#25D366',
    boxShadow: '0 4px 20px rgba(37, 211, 102, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9999,
    color: '#fff',
    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  };

  const consoleStyle = {
    position: 'fixed',
    bottom: '96px',
    right: '24px',
    width: '340px',
    height: '420px',
    backgroundColor: '#0f172a',
    border: '1px solid #10b981',
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9999,
  };

  return (
    <>
      {/* Visual Floating Label Next to Bubble */}
      {!isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '34px',
          right: '96px',
          backgroundColor: '#075E54',
          color: '#fff',
          padding: '0.45rem 1rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          zIndex: 9998,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          border: '1px solid rgba(37, 211, 102, 0.3)',
          animation: 'whatsappBounce 2s infinite'
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: '#25D366', display: 'inline-block',
            animation: 'whatsappFlash 1s infinite'
          }}></span>
          <span>WhatsApp Sandbox Live</span>
        </div>
      )}

      {/* Floating Green WhatsApp Bubble */}
      <div 
        style={bubbleStyle}
        className="whatsapp-bubble"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Open WhatsApp Business Simulator Console"
      >
        <MessageSquare size={28} />
        {messages.length > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            backgroundColor: '#ef4444', color: '#fff', fontSize: '0.65rem',
            padding: '0.1rem 0.35rem', borderRadius: '10px', fontWeight: 'bold'
          }}>
            {messages.length}
          </span>
        )}
      </div>

      {/* Expanded Messaging Console */}
      {isOpen && (
        <div style={consoleStyle}>
          {/* Header */}
          <div style={{
            backgroundColor: '#075E54', padding: '0.8rem 1rem', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#25D366' }}></div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>WhatsApp Business Simulator</span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button 
                onClick={handleClear}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 0 }}
                title="Clear All Alert Logs"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div style={{
            flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex',
            flexDirection: 'column', gap: '0.75rem', backgroundImage: 'radial-gradient(circle, rgba(7,94,84,0.05) 1px, transparent 1px)',
            backgroundSize: '16px 16px', backgroundColor: '#090d16'
          }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <ShieldCheck size={32} style={{ color: '#10b981', opacity: 0.6 }} />
                <p style={{ fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>WhatsApp Business Sandbox Active.</p>
                <span style={{ fontSize: '0.65rem', textAlign: 'center' }}>Book appointments or complete payments to see simulation logs.</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{
                  alignSelf: 'flex-start', maxWidth: '85%',
                  backgroundColor: '#054740', color: '#fff', padding: '0.6rem 0.8rem',
                  borderRadius: '0 8px 8px 8px', border: '1px solid rgba(37, 211, 102, 0.2)',
                  fontSize: '0.8rem', position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ color: '#25D366', fontWeight: 800, fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                    CareHMS business
                  </div>
                  <div style={{ lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                  <div style={{
                    fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right',
                    marginTop: '0.25rem'
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes whatsappBounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-6px); }
        }
        @keyframes whatsappFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
};

export default WhatsappSimulator;
