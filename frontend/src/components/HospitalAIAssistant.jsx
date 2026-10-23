import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  Bot, X, Send, Minimize2, Maximize2, Stethoscope,
  RotateCcw, Sparkles, AlertCircle, Calendar,
  CheckCircle2, ChevronRight, Clock, User
} from 'lucide-react';

/* ─── Time Slots ───────────────────────────────────────────────── */
const ALL_SLOTS = [
  '09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM',
  '04:00 PM','04:30 PM','05:00 PM',
];

/* ─── Quick Actions ────────────────────────────────────────────── */
const QUICK_ACTIONS = {
  patient: [
    '📅 Appointment book karo',
    '🤒 Bukhaar mein kya karna chahiye?',
    '💊 Meri medicines kya hain?',
    '🏥 Kaunse doctor se milna chahiye?',
    '📋 Mere latest reports kya hain?',
  ],
  doctor: [
    '📊 Aaj ke pending appointments?','💉 Prescription guide?',
    '🏥 Available beds?','📈 Department metrics?','🔬 Lab results interpret karo',
  ],
  admin: [
    '📊 Hospital metrics?','👥 Staff availability?',
    '🛏️ Bed occupancy?','💰 Pending billing?','🚨 Critical alerts?',
  ],
  receptionist: [
    '📅 Aaj ke appointments','🏥 Patient registration guide?',
    '🛏️ Room/bed availability?','📞 Emergency numbers?','💊 Pharmacy contact?',
  ],
};

/* ─── Typing Dots ──────────────────────────────────────────────── */
const TypingIndicator = () => (
  <div style={{ display:'flex', gap:'4px', alignItems:'center', height:'20px' }}>
    {[0,1,2].map(i => (
      <div key={i} style={{
        width:'7px', height:'7px', borderRadius:'50%', background:'#3b82f6',
        animation:`aiDot 1.2s infinite ease-in-out ${i*0.2}s`
      }}/>
    ))}
  </div>
);

/* ─── Booking Widget (rendered as a chat bubble) ───────────────── */
function BookingWidget({ onBooked, onCancel }) {
  const [step, setStep]           = useState(1); // 1=dept, 2=doctor, 3=datetime, 4=confirm, 5=done
  const [departments, setDepts]   = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [bookedSlots, setBooked]  = useState([]);
  const [selDept, setSelDept]     = useState(null);
  const [selDoctor, setSelDoctor] = useState(null);
  const [selDate, setSelDate]     = useState('');
  const [selSlot, setSelSlot]     = useState('');
  const [symptoms, setSymptoms]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Fetch departments on mount
  useEffect(() => {
    api.get('/departments')
      .then(d => setDepts(d))
      .catch(() => setErr('Departments load nahi hue. Retry karein.'));
  }, []);

  // Fetch doctors when dept selected
  useEffect(() => {
    if (!selDept) return;
    setLoading(true);
    api.get('/doctors')
      .then(d => {
        const filtered = d.filter(doc =>
          doc.department?._id === selDept._id || doc.department === selDept._id
        );
        setDoctors(filtered.length ? filtered : d); // fallback: all doctors
      })
      .catch(() => setErr('Doctors load nahi hue.'))
      .finally(() => setLoading(false));
  }, [selDept]);

  // Fetch booked slots when doctor+date selected
  useEffect(() => {
    if (!selDoctor || !selDate) return;
    api.get(`/appointments/booked-slots?doctorId=${selDoctor._id}&date=${selDate}`)
      .then(slots => setBooked(slots))
      .catch(() => setBooked([]));
  }, [selDoctor, selDate]);

  const handleBook = async () => {
    setLoading(true); setErr('');
    try {
      await api.post('/appointments', {
        doctorId:     selDoctor._id,
        departmentId: selDept._id,
        date:         selDate,
        timeSlot:     selSlot,
        symptoms:     symptoms || 'General consultation',
      });
      setStep(5);
      onBooked(selDoctor?.user?.name || 'Doctor', selDate, selSlot, selDept?.name);
    } catch (e) {
      setErr(e.message || 'Booking fail ho gayi. Dobara try karein.');
    } finally {
      setLoading(false);
    }
  };

  const availSlots = ALL_SLOTS.filter(s => !bookedSlots.includes(s));

  const S = { // shared micro styles
    card: { background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.18)',
             borderRadius:'12px', padding:'0.85rem', marginTop:'0.5rem' },
    label: { fontSize:'0.68rem', fontWeight:700, color:'#64748b',
              textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.45rem' },
    chip: (active) => ({
      padding:'0.35rem 0.65rem', borderRadius:'8px', fontSize:'0.75rem',
      border:`1px solid ${active ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
      background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
      color: active ? '#93c5fd' : '#94a3b8',
      cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
    }),
    btn: { padding:'0.5rem 1rem', borderRadius:'8px', border:'none',
           background:'linear-gradient(135deg,#3b82f6,#0ea5e9)',
           color:'#fff', fontWeight:700, fontSize:'0.8rem',
           cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem' },
    btnSm: { padding:'0.3rem 0.7rem', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.1)',
              background:'rgba(255,255,255,0.04)', color:'#94a3b8',
              fontSize:'0.72rem', cursor:'pointer', fontFamily:'inherit' },
  };

  if (step === 5) return (
    <div style={{ ...S.card, borderColor:'rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.07)', textAlign:'center', padding:'1.25rem' }}>
      <CheckCircle2 size={32} color="#10b981" style={{ marginBottom:'0.5rem' }} />
      <div style={{ fontWeight:800, color:'#10b981', fontSize:'0.9rem' }}>Appointment Booked! ✅</div>
      <div style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:'0.3rem' }}>
        Confirmation aapke account mein save ho gayi hai.
      </div>
    </div>
  );

  return (
    <div style={S.card}>
      {/* Progress bar */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'0.75rem' }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{
            flex:1, height:'3px', borderRadius:'2px',
            background: step >= n ? '#3b82f6' : 'rgba(255,255,255,0.08)',
            transition:'background 0.3s'
          }}/>
        ))}
      </div>

      {err && (
        <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', padding:'0.4rem 0.6rem',
                      background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
                      borderRadius:'6px', color:'#fca5a5', fontSize:'0.74rem', marginBottom:'0.6rem' }}>
          <AlertCircle size={12}/> {err}
        </div>
      )}

      {/* STEP 1: Department */}
      {step === 1 && (
        <>
          <div style={S.label}>🏥 Step 1 — Department chunein</div>
          {departments.length === 0
            ? <div style={{ color:'#64748b', fontSize:'0.78rem' }}>Loading departments...</div>
            : <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                {departments.map(d => (
                  <button key={d._id} onClick={() => { setSelDept(d); setStep(2); }} style={S.chip(selDept?._id===d._id)}>
                    {d.name}
                  </button>
                ))}
              </div>
          }
        </>
      )}

      {/* STEP 2: Doctor */}
      {step === 2 && (
        <>
          <div style={S.label}>👨‍⚕️ Step 2 — Doctor chunein ({selDept?.name})</div>
          {loading
            ? <div style={{ color:'#64748b', fontSize:'0.78rem' }}>Doctors load ho rahe hain...</div>
            : doctors.length === 0
              ? <div style={{ color:'#64748b', fontSize:'0.78rem' }}>Koi doctor available nahi.</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  {doctors.map(doc => (
                    <button key={doc._id}
                      onClick={() => { setSelDoctor(doc); setStep(3); }}
                      style={{
                        ...S.chip(selDoctor?._id===doc._id),
                        display:'flex', alignItems:'center', gap:'0.5rem',
                        padding:'0.5rem 0.75rem', textAlign:'left',
                      }}>
                      <User size={13}/>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'0.78rem' }}>Dr. {doc.user?.name}</div>
                        <div style={{ fontSize:'0.68rem', color:'#64748b' }}>{doc.specialization} · ₹{doc.consultationFee}</div>
                      </div>
                    </button>
                  ))}
                </div>
          }
          <button onClick={() => setStep(1)} style={{ ...S.btnSm, marginTop:'0.5rem' }}>← Back</button>
        </>
      )}

      {/* STEP 3: Date + Time Slot */}
      {step === 3 && (
        <>
          <div style={S.label}>📅 Step 3 — Date aur Time chunein</div>
          <div>
            <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginBottom:'0.3rem' }}>Date:</div>
            <input
              type="date"
              min={today}
              value={selDate}
              onChange={e => { setSelDate(e.target.value); setSelSlot(''); }}
              style={{
                background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:'8px', padding:'0.45rem 0.75rem', color:'#fff',
                fontSize:'0.82rem', width:'100%', outline:'none',
                fontFamily:'inherit', marginBottom:'0.65rem',
              }}
            />
          </div>

          {selDate && (
            <>
              <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginBottom:'0.35rem' }}>
                <Clock size={11} style={{ marginRight:'3px' }}/> Available Slots:
              </div>
              {availSlots.length === 0
                ? <div style={{ color:'#ef4444', fontSize:'0.75rem' }}>Koi slot available nahi is date pe.</div>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem' }}>
                    {availSlots.map(slot => (
                      <button key={slot} onClick={() => setSelSlot(slot)} style={S.chip(selSlot===slot)}>
                        {slot}
                      </button>
                    ))}
                  </div>
              }
            </>
          )}

          <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.65rem' }}>
            <button onClick={() => setStep(2)} style={S.btnSm}>← Back</button>
            {selDate && selSlot && (
              <button onClick={() => setStep(4)} style={S.btn}>
                Next <ChevronRight size={13}/>
              </button>
            )}
          </div>
        </>
      )}

      {/* STEP 4: Confirm */}
      {step === 4 && (
        <>
          <div style={S.label}>✅ Step 4 — Confirm Booking</div>
          <div style={{ fontSize:'0.78rem', lineHeight:1.8, color:'#cbd5e1' }}>
            <div>🏥 <strong>Department:</strong> {selDept?.name}</div>
            <div>👨‍⚕️ <strong>Doctor:</strong> Dr. {selDoctor?.user?.name}</div>
            <div>📅 <strong>Date:</strong> {new Date(selDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
            <div>🕐 <strong>Time:</strong> {selSlot}</div>
            <div>💰 <strong>Fee:</strong> ₹{selDoctor?.consultationFee} + 18% GST</div>
          </div>

          <div style={{ marginTop:'0.65rem' }}>
            <div style={{ fontSize:'0.68rem', color:'#64748b', marginBottom:'0.3rem' }}>
              Symptoms / Reason (optional):
            </div>
            <textarea
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              placeholder="e.g. Bukhaar, sar dard, pet dard..."
              style={{
                width:'100%', background:'rgba(0,0,0,0.25)',
                border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px',
                padding:'0.5rem 0.75rem', color:'#fff', fontSize:'0.78rem',
                outline:'none', fontFamily:'inherit', resize:'vertical', minHeight:'55px',
              }}
            />
          </div>

          <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.65rem' }}>
            <button onClick={() => setStep(3)} style={S.btnSm}>← Back</button>
            <button onClick={handleBook} disabled={loading} style={{ ...S.btn, flex:1, justifyContent:'center' }}>
              {loading ? 'Booking...' : '✅ Confirm & Book'}
            </button>
          </div>
        </>
      )}

      {/* Cancel */}
      {step < 5 && (
        <button onClick={onCancel} style={{ ...S.btnSm, marginTop:'0.5rem', color:'#ef4444', borderColor:'rgba(239,68,68,0.2)' }}>
          ✕ Cancel
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function HospitalAIAssistant() {
  const { user } = useAuth();

  const [isOpen, setIsOpen]               = useState(false);
  const [isMinimized, setIsMinimized]     = useState(false);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [showBooking, setShowBooking]     = useState(false);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  const now = () =>
    new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

  const getWelcome = () => {
    if (!user) return 'Namaste! Main CareHMS AI Assistant hoon. 🏥';
    const first = user.name?.split(' ')[0] || 'User';
    const last  = user.name?.split(' ').pop() || '';
    return ({
      patient:      `Namaste ${first} ji! 🙏 Main **CareHMS AI** hoon. Appointment book karna ho, symptoms samajhne hon, ya koi bhi health sawaal — main madad ke liye hoon!`,
      doctor:       `Good day, Dr. ${last}! 👨‍⚕️ Main **CareHMS AI** hoon. Clinical queries, drug info, patient management — ready hoon!`,
      admin:        `Hello ${first}! 🏥 Hospital operations, metrics, staff — koi bhi topic pe poochhen.`,
      receptionist: `Hi ${first}! 📋 Patient registration, appointments, billing — help ke liye ready hoon!`,
    })[user.role] || 'Namaste! Main CareHMS AI hoon. 🏥';
  };

  useEffect(() => {
    if (isOpen && messages.length === 0)
      setMessages([{ role:'assistant', text:getWelcome(), time:now() }]);
    if (isOpen) { setUnreadCount(0); setIsMinimized(false); setTimeout(() => inputRef.current?.focus(), 300); }
  }, [isOpen]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading, showBooking]);

  // Detect booking intent in message
  const isBookingIntent = (text) => {
    const t = text.toLowerCase();
    return t.includes('appointment') || t.includes('book') ||
           t.includes('doctor se milna') || t.includes('doctor bulao') ||
           t.includes('consultation') || t.includes('schedule');
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    setError('');
    setShowQuickActions(false);
    setMessages(prev => [...prev, { role:'user', text:userText, time:now() }]);

    // Patient + booking intent → show widget
    if (user?.role === 'patient' && isBookingIntent(userText)) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role:'assistant',
          text:'Bilkul! Main abhi aapka appointment book karta hoon. Neeche booking form fill karein 👇',
          time:now(),
        }]);
        setShowBooking(true);
      }, 500);
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/ai/chat', {
        message:  userText,
        userRole: user?.role || 'patient',
        userName: user?.name || 'User',
        history:  messages.slice(-8).map(m => ({ role:m.role, text:m.text })),
      });
      const reply = data.reply || 'Mujhe samajh nahi aaya. Dobara poochhen.';
      setMessages(prev => [...prev, { role:'assistant', text:reply, time:now() }]);
      if (isMinimized) setUnreadCount(c => c + 1);
    } catch (e) {
      setError(e.message || 'AI se connect nahi ho pa raha.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooked = (doctorName, date, slot, dept) => {
    setShowBooking(false);
    setMessages(prev => [...prev, {
      role:'assistant',
      text:`🎉 **Appointment Successfully Booked!**\n\n👨‍⚕️ **Doctor:** Dr. ${doctorName}\n🏥 **Department:** ${dept}\n📅 **Date:** ${new Date(date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}\n🕐 **Time:** ${slot}\n\nAapka appointment confirm ho gaya hai! Billing section mein invoice generate ho gayi hai. Appointment se 15 minute pehle hospital pahunchen. Koi aur madad chahiye? 😊`,
      time:now(),
    }]);
  };

  const clearChat = () => {
    setMessages([{ role:'assistant', text:getWelcome(), time:now() }]);
    setShowQuickActions(true);
    setShowBooking(false);
    setError('');
  };

  const formatText = (text) => {
    let f = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    f = f.replace(/^[•\-]\s(.+)$/gm, '<li>$1</li>');
    f = f.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="padding-left:1.2rem;margin:0.35rem 0">$1</ul>');
    f = f.replace(/\n/g, '<br/>');
    return f;
  };

  const quickActions = QUICK_ACTIONS[user?.role] || QUICK_ACTIONS.patient;

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <>
      {/* FAB */}
      <button onClick={() => setIsOpen(o => !o)} title="Hospital AI Assistant" style={{
        position:'fixed', bottom:'100px', right:'24px',
        width:'56px', height:'56px', borderRadius:'50%', border:'none',
        background: isOpen ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,#3b82f6,#0ea5e9)',
        color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', zIndex:9998, boxShadow:'0 6px 24px rgba(59,130,246,0.5)',
        transition:'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {isOpen ? <X size={22}/> : <Bot size={24}/>}
        {!isOpen && unreadCount > 0 && (
          <span style={{
            position:'absolute', top:'-4px', right:'-4px',
            width:'18px', height:'18px', borderRadius:'50%',
            background:'#ef4444', color:'#fff', fontSize:'0.62rem', fontWeight:800,
            display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #0f172a',
          }}>{unreadCount}</span>
        )}
        {!isOpen && <span style={{
          position:'absolute', inset:0, borderRadius:'50%',
          background:'rgba(59,130,246,0.35)',
          animation:'aiFabPulse 2s ease-out infinite', pointerEvents:'none',
        }}/>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position:'fixed', bottom:'168px', right:'24px', width:'370px',
          height: isMinimized ? '56px' : '540px',
          background:'linear-gradient(180deg,#0f172a 0%,#1e293b 100%)',
          border:'1px solid rgba(59,130,246,0.3)', borderRadius:'20px',
          zIndex:9997, display:'flex', flexDirection:'column', overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,0.65)',
          transition:'height 0.3s ease', animation:'aiSlideUp 0.3s ease-out',
        }}>

          {/* Header */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'0.85rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.06)',
            background:'rgba(59,130,246,0.1)', flexShrink:0,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
              <div style={{
                width:'32px', height:'32px', borderRadius:'50%',
                background:'linear-gradient(135deg,#3b82f6,#0ea5e9)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Stethoscope size={16} color="#fff"/>
              </div>
              <div>
                <div style={{ fontSize:'0.88rem', fontWeight:700, color:'#fff' }}>CareHMS AI</div>
                <div style={{ fontSize:'0.66rem', color:'#64748b', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', display:'inline-block' }}/>
                  Online · Book Appointments too!
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'0.25rem' }}>
              {[
                { icon:<RotateCcw size={14}/>, fn:clearChat, title:'New Chat' },
                { icon: isMinimized ? <Maximize2 size={14}/> : <Minimize2 size={14}/>, fn:()=>setIsMinimized(m=>!m), title:'Toggle' },
                { icon:<X size={14}/>, fn:()=>setIsOpen(false), title:'Close' },
              ].map((b,i) => (
                <button key={i} onClick={b.fn} title={b.title} style={{
                  background:'rgba(255,255,255,0.06)', border:'none', color:'#94a3b8',
                  cursor:'pointer', padding:'0.35rem', borderRadius:'6px',
                  display:'flex', alignItems:'center',
                }}>{b.icon}</button>
              ))}
            </div>
          </div>

          {!isMinimized && (<>
            {/* Messages */}
            <div style={{
              flex:1, overflowY:'auto', padding:'1rem',
              display:'flex', flexDirection:'column', gap:'0.75rem',
            }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display:'flex', gap:'0.5rem', alignItems:'flex-end',
                  justifyContent: msg.role==='user' ? 'flex-end' : 'flex-start',
                }}>
                  {msg.role==='assistant' && (
                    <div style={{
                      width:'24px', height:'24px', borderRadius:'50%',
                      background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexShrink:0, marginBottom:'2px',
                    }}><Bot size={13} color="#3b82f6"/></div>
                  )}
                  <div style={{
                    maxWidth:'84%', padding:'0.6rem 0.85rem',
                    borderRadius: msg.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize:'0.82rem', lineHeight:1.55,
                    background: msg.role==='user'
                      ? 'linear-gradient(135deg,#3b82f6,#0ea5e9)'
                      : 'rgba(255,255,255,0.05)',
                    border: msg.role==='user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    color:'#e2e8f0',
                  }}>
                    <div dangerouslySetInnerHTML={{ __html:formatText(msg.text) }}/>
                    <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.3)', textAlign:'right', marginTop:'0.25rem' }}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}

              {/* Inline Booking Widget */}
              {showBooking && (
                <div style={{ paddingLeft:'30px' }}>
                  <BookingWidget
                    onBooked={handleBooked}
                    onCancel={() => {
                      setShowBooking(false);
                      setMessages(prev => [...prev, { role:'assistant', text:'Booking cancel kar di. Koi aur madad chahiye?', time:now() }]);
                    }}
                  />
                </div>
              )}

              {/* Book Appointment CTA — only for patient */}
              {!showBooking && user?.role === 'patient' && messages.length > 0 && !showQuickActions && (
                <div style={{ paddingLeft:'30px' }}>
                  <button
                    onClick={() => { setShowBooking(true); setMessages(prev=>[...prev,{role:'assistant',text:'Bilkul! Neeche appointment form fill karein 👇',time:now()}]); }}
                    style={{
                      display:'flex', alignItems:'center', gap:'0.4rem',
                      padding:'0.4rem 0.85rem', borderRadius:'100px', border:'none',
                      background:'rgba(59,130,246,0.12)', borderWidth:'1px',
                      borderStyle:'solid', borderColor:'rgba(59,130,246,0.25)',
                      color:'#93c5fd', fontSize:'0.74rem', cursor:'pointer', fontFamily:'inherit',
                    }}
                  >
                    <Calendar size={13}/> Appointment Book Karein
                  </button>
                </div>
              )}

              {loading && (
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'flex-end' }}>
                  <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Bot size={13} color="#3b82f6"/>
                  </div>
                  <div style={{ padding:'0.6rem 1rem', borderRadius:'14px 14px 14px 4px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <TypingIndicator/>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.5rem 0.75rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'8px', color:'#fca5a5', fontSize:'0.78rem' }}>
                  <AlertCircle size={14}/><span>{error}</span>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            {/* Quick Actions */}
            {showQuickActions && messages.length <= 1 && (
              <div style={{ padding:'0 0.75rem 0.5rem', flexShrink:0 }}>
                <div style={{ fontSize:'0.63rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.4rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <Sparkles size={11} color="#3b82f6"/> Quick Actions
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem' }}>
                  {quickActions.map((q,i) => (
                    <button key={i} onClick={() => sendMessage(q)} style={{
                      background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)',
                      borderRadius:'100px', padding:'0.3rem 0.65rem',
                      fontSize:'0.7rem', color:'#93c5fd', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
                    }}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div style={{ display:'flex', gap:'0.5rem', padding:'0.75rem', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0, alignItems:'center' }}>
              <input
                ref={inputRef}
                type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
                placeholder={showBooking ? 'Booking form neeche fill karein...' : 'Apna sawaal poochhen...'}
                disabled={loading || showBooking}
                style={{
                  flex:1, background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px',
                  padding:'0.6rem 0.85rem', color:'#fff', fontSize:'0.85rem',
                  outline:'none', fontFamily:'inherit',
                }}
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim() || showBooking} style={{
                width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                background:'linear-gradient(135deg,#3b82f6,#0ea5e9)',
                border:'none', color:'#fff', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                opacity: loading || !input.trim() || showBooking ? 0.4 : 1,
              }}><Send size={16}/></button>
            </div>

            <div style={{ textAlign:'center', fontSize:'0.6rem', color:'#1e293b', padding:'0 0.75rem 0.5rem', flexShrink:0 }}>
              🔒 Secure · Verify medical info with your doctor
            </div>
          </>)}
        </div>
      )}

      <style>{`
        @keyframes aiDot {
          0%,80%,100% { transform:scale(0.55); opacity:0.35; }
          40%          { transform:scale(1);    opacity:1; }
        }
        @keyframes aiFabPulse {
          0%   { transform:scale(1);   opacity:0.5; }
          100% { transform:scale(2.1); opacity:0; }
        }
        @keyframes aiSlideUp {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
