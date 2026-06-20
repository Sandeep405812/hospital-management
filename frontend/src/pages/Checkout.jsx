import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { CreditCard as CardIcon, QrCode, Building, CheckCircle, Landmark, ShieldCheck } from 'lucide-react';

const Checkout = () => {
  const { id } = useParams(); // Billing ID
  const navigate = useNavigate();
  
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('card'); // card, upi, netbanking
  const [settings, setSettings] = useState({
    upiId: 'admin.carehms@icici',
    bankName: 'ICICI Bank Ltd.',
    accountName: 'AS HOSPITAL General Account',
    accountNumber: '91820038190',
    ifscCode: 'ICIC0000192'
  });
  
  // Card states
  const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  // UPI Countdown timer
  const [timer, setTimer] = useState(300); // 5 minutes

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const data = await api.get('/billing');
        const match = data.find((b) => b._id === id);
        if (!match) {
          alert('Invoice not found');
          navigate('/billing');
          return;
        }
        setBill(match);

        // Fetch settings dynamically
        try {
          const settingsData = await api.get('/settings');
          setSettings(settingsData);
        } catch (settingsErr) {
          console.error('Failed to load payment settings', settingsErr);
        }
      } catch (err) {
        console.error('Failed to load invoice', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [id, navigate]);

  // UPI Timer effect
  useEffect(() => {
    if (activeTab !== 'upi' || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab, timer]);

  const handleCardChange = (e) => {
    setCardForm({ ...cardForm, [e.target.name]: e.target.value });
  };

  // Interactive payment gateway simulator states
  const [showOtpOverlay, setShowOtpOverlay] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [paymentMethodPending, setPaymentMethodPending] = useState('');
  const [processingStatus, setProcessingStatus] = useState(''); // authenticating, otp, upi_wait, netbanking_login, verifying, success
  const [netbankingForm, setNetbankingForm] = useState({ username: '', password: '' });

  const handlePay = (e) => {
    e.preventDefault();
    const methodMap = {
      card: 'Card',
      upi: 'UPI',
      netbanking: 'NetBanking',
    };
    const method = methodMap[activeTab];
    setPaymentMethodPending(method);
    setOtpValue('');
    setOtpError('');
    setNetbankingForm({ username: '', password: '' });
    setShowOtpOverlay(true);
    setProcessingStatus('authenticating');

    setTimeout(() => {
      if (method === 'Card') {
        setProcessingStatus('otp');
      } else if (method === 'UPI') {
        setProcessingStatus('upi_wait');
      } else {
        setProcessingStatus('netbanking_login');
      }
    }, 1200);
  };

  const handleVerifyAndPay = async (e) => {
    if (e) e.preventDefault();
    
    if (processingStatus === 'otp' && otpValue.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP code');
      return;
    }
    
    if (processingStatus === 'netbanking_login' && (!netbankingForm.username || !netbankingForm.password)) {
      setOtpError('Please enter your NetBanking username and password');
      return;
    }

    setOtpError('');
    setProcessingStatus('verifying');

    try {
      // Simulate verification latency
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update DB billing status
      await api.put(`/billing/${id}/pay`, { paymentMethod: paymentMethodPending });
      
      setProcessingStatus('success');
      setTimeout(() => {
        setShowOtpOverlay(false);
        navigate('/billing');
      }, 1500);
    } catch (err) {
      alert(err.message || 'Payment processing failed');
      // Reset back to previous form on error
      if (paymentMethodPending === 'Card') {
        setProcessingStatus('otp');
      } else if (paymentMethodPending === 'UPI') {
        setProcessingStatus('upi_wait');
      } else {
        setProcessingStatus('netbanking_login');
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading || !bill) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Opening secure checkout...</div>;
  }

  // Styles
  const checkoutContainerStyle = {
    maxWidth: '850px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '2rem',
    padding: '1rem',
  };

  const leftPanelStyle = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--border-radius-lg)',
    padding: '2rem',
    boxShadow: 'var(--shadow-md)',
  };

  const rightPanelStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--border-radius-lg)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 'fit-content',
  };

  const tabStyle = (active) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
    border: '1px solid',
    borderColor: active ? 'var(--accent-blue)' : 'var(--glass-border)',
    borderRadius: 'var(--border-radius)',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    transition: 'var(--transition-smooth)',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Gateway</h1>
          <p className="page-subtitle">Secure Telemedicine Checkout Engine</p>
        </div>
      </div>

      <div style={checkoutContainerStyle} className="checkout-grid">
        {/* Left Panel: Payment Forms */}
        <div style={leftPanelStyle}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.2rem' }}>Select Payment Option</h3>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button type="button" style={tabStyle(activeTab === 'card')} onClick={() => setActiveTab('card')}>
              <CardIcon size={20} />
              <span>Card Payment</span>
            </button>
            <button type="button" style={tabStyle(activeTab === 'upi')} onClick={() => { setActiveTab('upi'); setTimer(300); }}>
              <QrCode size={20} />
              <span>UPI Scan</span>
            </button>
            <button type="button" style={tabStyle(activeTab === 'netbanking')} onClick={() => setActiveTab('netbanking')}>
              <Building size={20} />
              <span>NetBanking</span>
            </button>
          </div>

          <form onSubmit={handlePay}>
            {/* Card Payment Form */}
            {activeTab === 'card' && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                {/* Virtual Card Graphic */}
                <div style={{
                  width: '100%',
                  height: '160px',
                  borderRadius: 'var(--border-radius)',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e1b4b 100%)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 600 }}>CAREHMS GOLD</span>
                    <span style={{ fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 800 }}>VISA</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', letterSpacing: '4px', fontFamily: 'monospace' }}>
                    {cardForm.number || '•••• •••• •••• ••••'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem' }}>CARD HOLDER</p>
                      <p style={{ fontWeight: 600 }}>{cardForm.name.toUpperCase() || 'YOUR NAME'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem' }}>EXPIRES</p>
                      <p style={{ fontWeight: 600 }}>{cardForm.expiry || 'MM/YY'}</p>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Card Holder Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="John Doe"
                    value={cardForm.name}
                    onChange={handleCardChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input
                    type="text"
                    name="number"
                    className="form-input"
                    maxLength="19"
                    placeholder="4111 2222 3333 4444"
                    value={cardForm.number}
                    onChange={handleCardChange}
                    required
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Expiry Date</label>
                    <input
                      type="text"
                      name="expiry"
                      className="form-input"
                      placeholder="MM/YY"
                      maxLength="5"
                      value={cardForm.expiry}
                      onChange={handleCardChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input
                      type="password"
                      name="cvv"
                      className="form-input"
                      placeholder="•••"
                      maxLength="3"
                      value={cardForm.cvv}
                      onChange={handleCardChange}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* UPI QR Payment */}
            {activeTab === 'upi' && (
              <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Scan the secure QR Code below using GooglePay, PhonePe, or Paytm app.
                </p>
                <div style={{
                  display: 'inline-block',
                  padding: '1.25rem',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--border-radius)',
                  marginBottom: '1rem',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  {bill && (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.accountName)}&am=${bill.total}&tn=${bill._id}&cu=INR`
                      )}`}
                      alt="UPI Payment QR Code"
                      style={{ width: '180px', height: '180px', display: 'block' }}
                    />
                  )}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '1.5rem' }}>
                  Code expires in: <span style={{ fontFamily: 'monospace' }}>{formatTime(timer)}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p><strong>Beneficiary Account:</strong> {settings.accountName}</p>
                  <p>Ref Merchant UPI ID: <code style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{settings.upiId}</code></p>
                </div>
              </div>
            )}

            {/* NetBanking Options */}
            {activeTab === 'netbanking' && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Select your bank from the dropdown options to connect to their billing interface.
                </p>
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  border: '1px dashed rgba(59, 130, 246, 0.2)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6'
                }}>
                  <p style={{ color: 'var(--accent-blue)', fontWeight: 700, marginBottom: '0.25rem' }}>Admin Beneficiary Account:</p>
                  <p>Bank: <strong>{settings.bankName}</strong></p>
                  <p>A/c Name: <strong>{settings.accountName}</strong></p>
                  <p>A/c Number: <strong>{settings.accountNumber}</strong></p>
                  <p>IFSC Code: <strong>{settings.ifscCode}</strong></p>
                </div>
                <div className="form-group">
                  <label className="form-label">Choose Bank</label>
                  <select className="form-select" required>
                    <option value="sbi">State Bank of India</option>
                    <option value="hdfc">HDFC Bank</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="axis">Axis Bank</option>
                    <option value="kotak">Kotak Mahindra Bank</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }} disabled={loading}>
              <ShieldCheck size={20} />
              <span>Confirm & Process Payment</span>
            </button>
          </form>
        </div>

        {/* Right Panel: Bill Invoice Summary */}
        <div style={rightPanelStyle}>
          <div>
            <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>Summary</h3>
            {bill && (
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Invoice No:</span>
                  <span style={{ fontWeight: 600 }}>#{bill._id.slice(-6).toUpperCase()}</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Consultation:</span>
                  <span style={{ fontWeight: 600 }}>{bill.appointment?.doctor?.user?.name}</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                  <span>₹{bill.amount}</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GST (18%):</span>
                  <span>₹{bill.tax}</span>
                </p>
                <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                  <span>Grand Total:</span>
                  <span style={{ color: 'var(--accent-teal)' }}>₹{bill.total}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <Landmark size={18} style={{ color: 'var(--success)' }} />
            <span>Encrypted with bank-grade 256-bit SSL connection.</span>
          </div>
        </div>

      {/* Stripe/Razorpay Mock Payment Gateway Modal Overlay */}
      {showOtpOverlay && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2.5rem',
            maxWidth: '460px', width: '90%', textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            {/* 1. AUTHENTICATING STATE */}
            {processingStatus === 'authenticating' && (
              <div style={{ padding: '2rem 0' }}>
                <div style={{
                  width: '60px', height: '60px', border: '4px solid rgba(59, 130, 246, 0.1)',
                  borderTop: '4px solid var(--accent-blue)', borderRadius: '50%',
                  margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite'
                }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                  Contacting Bank Servers
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Initiating secure 3D transaction gateway handshake...
                </p>
              </div>
            )}

            {/* 2. CARD OTP STATE */}
            {processingStatus === 'otp' && (
              <form onSubmit={handleVerifyAndPay}>
                <div style={{
                  width: '50px', height: '50px', borderRadius: '50%',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)',
                  margin: '0 auto 1.25rem'
                }}>
                  <ShieldCheck size={28} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                  3D Secure Verification
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  A mock 6-digit OTP code has been sent to +91 ******89. Enter <strong>123456</strong> or any code.
                </p>

                <div className="form-group">
                  <input
                    type="text"
                    maxLength="6"
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 700 }}
                    placeholder="••••••"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                  {otpError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{otpError}</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary btn-full">Verify & Pay ₹{bill.total}</button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-full"
                    onClick={() => setShowOtpOverlay(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* 3. UPI AWAIT STATE */}
            {processingStatus === 'upi_wait' && (
              <div>
                <div style={{
                  width: '60px', height: '60px', border: '4px solid rgba(20, 184, 166, 0.1)',
                  borderTop: '4px solid var(--accent-teal)', borderRadius: '50%',
                  margin: '0 auto 1.5rem', animation: 'spin 1.2s linear infinite'
                }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                  Awaiting UPI Authorization
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Please open your smartphone UPI App (GPay/PhonePe) connected to your account and approve the request for <strong>₹{bill.total}</strong>.
                </p>

                <button
                  type="button"
                  className="btn btn-teal btn-full"
                  style={{ marginBottom: '1rem' }}
                  onClick={() => handleVerifyAndPay()}
                >
                  Simulate Approve Payment
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setShowOtpOverlay(false)}
                >
                  Cancel Transaction
                </button>
              </div>
            )}

            {/* 4. NETBANKING LOGIN STATE */}
            {processingStatus === 'netbanking_login' && (
              <form onSubmit={handleVerifyAndPay}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                  Secure NetBanking Portal
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Log in to your selected bank account securely to release funds of ₹{bill.total}.
                </p>

                <div className="form-group">
                  <label className="form-label" style={{ textAlign: 'left' }}>User ID / Customer ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter Username"
                    value={netbankingForm.username}
                    onChange={(e) => setNetbankingForm({ ...netbankingForm, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ textAlign: 'left' }}>IPIN / Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={netbankingForm.password}
                    onChange={(e) => setNetbankingForm({ ...netbankingForm, password: e.target.value })}
                    required
                  />
                  {otpError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{otpError}</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary btn-full">Authenticate Login</button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-full"
                    onClick={() => setShowOtpOverlay(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* 5. VERIFYING STATE */}
            {processingStatus === 'verifying' && (
              <div style={{ padding: '2rem 0' }}>
                <div style={{
                  width: '60px', height: '60px', border: '4px solid rgba(16, 185, 129, 0.1)',
                  borderTop: '4px solid var(--success)', borderRadius: '50%',
                  margin: '0 auto 1.5rem', animation: 'spin 0.8s linear infinite'
                }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                  Verifying Authorization
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Validating OTP verification token and settling transactions...
                </p>
              </div>
            )}

            {/* 6. SUCCESS STATE */}
            {processingStatus === 'success' && (
              <div style={{ padding: '2rem 0' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--success)',
                  margin: '0 auto 1.5rem',
                  animation: 'pulse 1s infinite'
                }}>
                  <CheckCircle size={36} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.5rem' }}>
                  Payment Approved!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Your invoice has been cleared successfully. Redirecting you...
                </p>
              </div>
            )}
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default Checkout;
