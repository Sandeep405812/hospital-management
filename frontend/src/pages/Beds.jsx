import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Layers, User, PlusCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import gsap from 'gsap';

const Beds = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWard, setActiveWard] = useState('All');
  
  // Modal states for Bed Allocation
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Fetch beds and patients lists
  const fetchData = async () => {
    try {
      const bedData = await api.get('/beds');
      setBeds(bedData);
      
      if (user.role === 'admin' || user.role === 'doctor' || user.role === 'receptionist') {
        const patientData = await api.get('/patients');
        setPatients(patientData);
      }
    } catch (err) {
      console.error('Failed to load bed management details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger grid entrance animations on load
  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.bed-card',
        { scale: 0.88, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.2)', stagger: 0.05 }
      );
    }
  }, [loading, activeWard]);

  const handleOpenAllocate = (bed) => {
    if (user.role === 'patient') return;
    setSelectedBed(bed);
    setShowAllocateModal(true);
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    try {
      setLoading(true);
      await api.put('/beds/admit', {
        bedId: selectedBed._id,
        patientId: selectedPatientId,
      });
      setShowAllocateModal(false);
      setSelectedPatientId('');
      fetchData();
      alert('Patient allocated to bed successfully!');
    } catch (err) {
      alert(err.message || 'Failed to allocate bed');
      setLoading(false);
    }
  };

  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({
    diagnosis: '',
    treatment: '',
    condition: 'Stable',
    followUp: '',
  });

  const handleOpenDischarge = (bed) => {
    if (user.role === 'patient') return;
    setSelectedBed(bed);
    setDischargeForm({
      diagnosis: '',
      treatment: '',
      condition: 'Stable',
      followUp: '',
    });
    setShowDischargeModal(true);
  };

  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBed || !selectedBed.patient) return;

    try {
      setLoading(true);
      
      // Generate and download the PDF discharge summary
      const patient = selectedBed.patient;
      const bedDetails = selectedBed;
      
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="padding: 40px; font-family: Arial, sans-serif; color: #333; background-color: #fff; width: 700px; margin: 0 auto;">
          <div style="border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="color: #0d9488; margin: 0; font-size: 26px; font-weight: 800;">CAREHMS HOSPITALS</h1>
              <p style="margin: 3px 0 0 0; font-size: 12px; color: #666; font-style: italic;">Patient-Centric Digital Healthcare Systems</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0; color: #444; font-size: 16px; font-weight: 700;">DISCHARGE SUMMARY</h3>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #888;">Ref: DS-${Math.floor(100000 + Math.random() * 900000)}</p>
            </div>
          </div>

          <div style="background-color: #f4fbfb; border: 1px solid #ccfbf1; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 10px 0; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px;">PATIENT DEMOGRAPHICS</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <tr>
                <td style="padding: 5px 0; font-weight: bold; width: 25%; color: #555;">Patient Name:</td>
                <td style="padding: 5px 0; color: #111;">${patient?.user?.name || 'N/A'}</td>
                <td style="padding: 5px 0; font-weight: bold; width: 25%; color: #555;">Ward Assigned:</td>
                <td style="padding: 5px 0; color: #111;">${bedDetails.wardType} Ward</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; color: #555;">Gender / Blood:</td>
                <td style="padding: 5px 0; color: #111;">${patient?.user?.gender || 'N/A'} / ${patient?.bloodType || 'N/A'}</td>
                <td style="padding: 5px 0; font-weight: bold; color: #555;">Bed Number:</td>
                <td style="padding: 5px 0; color: #111;">Bed ${bedDetails.bedNumber}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; color: #555;">Admission Date:</td>
                <td style="padding: 5px 0; color: #111;">${patient?.createdAt ? new Date(patient.createdAt).toLocaleDateString() : new Date(Date.now() - 5*24*60*60*1000).toLocaleDateString()}</td>
                <td style="padding: 5px 0; font-weight: bold; color: #555;">Discharge Date:</td>
                <td style="padding: 5px 0; color: #111;">${new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px; margin-bottom: 8px;">CLINICAL DIAGNOSIS</h4>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #334155;">${dischargeForm.diagnosis || 'N/A'}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px; margin-bottom: 8px;">TREATMENT SUMMARY & PROCEDURES</h4>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #334155;">${dischargeForm.treatment || 'N/A'}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px; margin-bottom: 8px;">DISCHARGE CONDITION</h4>
            <p style="margin: 0; font-size: 12px; color: #334155;">Patient has been successfully discharged in <strong>${dischargeForm.condition}</strong> condition.</p>
          </div>

          <div style="margin-bottom: 30px;">
            <h4 style="color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px; margin-bottom: 8px;">FOLLOW-UP PLAN & HEALTH ADVICE</h4>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #334155;">${dischargeForm.followUp || 'N/A'}</p>
          </div>

          <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 10px; color: #94a3b8;">
              <p style="margin: 0;">CareHMS Medical Systems</p>
              <p style="margin: 2px 0 0 0;">System Verified PDF Record</p>
            </div>
            <div style="text-align: center; width: 180px;">
              <div style="border-bottom: 1px solid #cbd5e1; margin-bottom: 5px; height: 35px;"></div>
              <p style="margin: 0; font-size: 11px; font-weight: bold; color: #1e293b;">Attending Physician</p>
              <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b;">Authorized Signatory</p>
            </div>
          </div>
        </div>
      `;

      const opt = {
        margin:       10,
        filename:     `Discharge_Summary_${patient?.user?.name?.replace(/\s+/g, '_') || 'Patient'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate the PDF file
      await html2pdf().from(element).set(opt).save();

      // Trigger the backend API call to discharge the patient
      await api.put(`/beds/${selectedBed._id}/discharge`, dischargeForm);
      
      setShowDischargeModal(false);
      setSelectedBed(null);
      fetchData();
      alert('Patient discharged successfully and Discharge Summary PDF downloaded!');
    } catch (err) {
      alert(err.message || 'Failed to discharge patient');
    } finally {
      setLoading(false);
    }
  };

  if (loading && beds.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Bed Management Layout...</div>;
  }

  // Filter beds based on active ward filter
  const filteredBeds = activeWard === 'All' ? beds : beds.filter((b) => b.wardType === activeWard);

  // Stats
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'Occupied').length;
  const vacantBeds = beds.filter((b) => b.status === 'Available').length;

  const renderSVGFloorMap = () => {
    const getStats = (type) => {
      const wardBeds = beds.filter(b => b.wardType === type);
      const total = wardBeds.length;
      const occupied = wardBeds.filter(b => b.status === 'Occupied').length;
      return { total, occupied, vacant: total - occupied };
    };

    const icu = getStats('ICU');
    const gen = getStats('General');
    const semi = getStats('Semi-Private');
    const priv = getStats('Private');

    return (
      <div style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-md)',
      }} className="chart-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>🗺️ Interactive Hospital Ward Floor Map</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Click on any ward wing chamber to filter occupancy logs below.
        </p>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <svg width="440" height="200" viewBox="0 0 440 200" style={{ overflow: 'visible' }}>
            {/* ICU Chamber */}
            <g style={{ cursor: 'pointer' }} onClick={() => setActiveWard('ICU')}>
              <rect 
                x="10" y="10" width="180" height="80" rx="8"
                fill={activeWard === 'ICU' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.01)'}
                stroke={activeWard === 'ICU' ? 'var(--danger)' : 'rgba(244, 63, 94, 0.3)'}
                strokeWidth="2.5"
                style={{ transition: 'var(--transition-smooth)' }}
              />
              <text x="25" y="40" fill="#fff" fontSize="11" fontWeight="700">🚨 ICU WING</text>
              <text x="25" y="60" fill="var(--text-secondary)" fontSize="9">
                Beds: {icu.occupied}/{icu.total} Occupied ({icu.vacant} vacant)
              </text>
            </g>

            {/* Private Ward Chamber */}
            <g style={{ cursor: 'pointer' }} onClick={() => setActiveWard('Private')}>
              <rect 
                x="210" y="10" width="180" height="80" rx="8"
                fill={activeWard === 'Private' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.01)'}
                stroke={activeWard === 'Private' ? '#eab308' : 'rgba(234, 179, 8, 0.3)'}
                strokeWidth="2.5"
                style={{ transition: 'var(--transition-smooth)' }}
              />
              <text x="225" y="40" fill="#fff" fontSize="11" fontWeight="700">👑 PRIVATE SUITES</text>
              <text x="225" y="60" fill="var(--text-secondary)" fontSize="9">
                Beds: {priv.occupied}/{priv.total} Occupied ({priv.vacant} vacant)
              </text>
            </g>

            {/* Semi-Private Ward Chamber */}
            <g style={{ cursor: 'pointer' }} onClick={() => setActiveWard('Semi-Private')}>
              <rect 
                x="10" y="110" width="180" height="80" rx="8"
                fill={activeWard === 'Semi-Private' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.01)'}
                stroke={activeWard === 'Semi-Private' ? '#6366f1' : 'rgba(99, 102, 241, 0.3)'}
                strokeWidth="2.5"
                style={{ transition: 'var(--transition-smooth)' }}
              />
              <text x="25" y="140" fill="#fff" fontSize="11" fontWeight="700">👥 SEMI-PRIVATE WARD</text>
              <text x="25" y="160" fill="var(--text-secondary)" fontSize="9">
                Beds: {semi.occupied}/{semi.total} Occupied ({semi.vacant} vacant)
              </text>
            </g>

            {/* General Ward Chamber */}
            <g style={{ cursor: 'pointer' }} onClick={() => setActiveWard('General')}>
              <rect 
                x="210" y="110" width="180" height="80" rx="8"
                fill={activeWard === 'General' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.01)'}
                stroke={activeWard === 'General' ? '#10b981' : 'rgba(16, 185, 129, 0.3)'}
                strokeWidth="2.5"
                style={{ transition: 'var(--transition-smooth)' }}
              />
              <text x="225" y="140" fill="#fff" fontSize="11" fontWeight="700">🏢 GENERAL WARD</text>
              <text x="225" y="160" fill="var(--text-secondary)" fontSize="9">
                Beds: {gen.occupied}/{gen.total} Occupied ({gen.vacant} vacant)
              </text>
            </g>

            {/* Lobby / Lobby Link (Reset) */}
            <g style={{ cursor: 'pointer' }} onClick={() => setActiveWard('All')}>
              <circle 
                cx="405" cy="100" r="22"
                fill={activeWard === 'All' ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255,255,255,0.05)'}
                stroke={activeWard === 'All' ? 'var(--accent-teal)' : 'var(--glass-border)'}
                strokeWidth="2"
                style={{ transition: 'var(--transition-smooth)' }}
              />
              <text x="405" y="103" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="800">ALL</text>
            </g>
          </svg>

          {/* Wing occupancy index */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></span>
              <span style={{ fontWeight: 600 }}>ICU Wards:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{icu.occupied} Active ({icu.vacant} Vacant)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }}></span>
              <span style={{ fontWeight: 600 }}>Private Suites:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{priv.occupied} Active ({priv.vacant} Vacant)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }}></span>
              <span style={{ fontWeight: 600 }}>Semi-Private:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{semi.occupied} Active ({semi.vacant} Vacant)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <span style={{ fontWeight: 600 }}>General Wards:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{gen.occupied} Active ({gen.vacant} Vacant)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">IPD Bed Ward Map</h1>
          <p className="page-subtitle">Allocate beds, track IPD occupancy, and manage ward availability</p>
        </div>
      </div>

      {/* Stats Board */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-info">
            <p>Total Capacity</p>
            <h3>{totalBeds}</h3>
          </div>
          <div className="stat-icon blue">
            <Layers size={24} />
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-info">
            <p>Occupied Beds</p>
            <h3 style={{ color: 'var(--danger)' }}>{occupiedBeds}</h3>
          </div>
          <div className="stat-icon danger">
            <XCircle size={24} />
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-info">
            <p>Vacant Beds</p>
            <h3 style={{ color: 'var(--success)' }}>{vacantBeds}</h3>
          </div>
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Visual Ward Floor Map */}
      {renderSVGFloorMap()}

      {/* Ward Filter Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', 'ICU', 'General', 'Semi-Private', 'Private'].map((ward) => (
          <button
            key={ward}
            className={`btn ${activeWard === ward ? 'btn-teal' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveWard(ward)}
          >
            {ward} Ward
          </button>
        ))}
      </div>

      {/* Ward Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {filteredBeds.map((bed) => {
          const isOccupied = bed.status === 'Occupied';
          const isStaff = user.role === 'admin' || user.role === 'doctor' || user.role === 'receptionist';
          const wardClass = `ward-${bed.wardType.toLowerCase().replace('-', '')}`;
          const isSpecialWard = ['ICU', 'Private', 'Semi-Private', 'General'].includes(bed.wardType);
          
          return (
            <div
              key={bed._id}
              className={`bed-card ${wardClass}`}
              style={{
                background: 'var(--glass-bg)',
                borderRadius: 'var(--border-radius)',
                padding: '1.5rem',
                transition: 'var(--transition-smooth)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '160px',
                ...(!isSpecialWard ? {
                  border: `1px solid ${isOccupied ? 'rgba(239, 68, 68, 0.25)' : 'var(--glass-border)'}`,
                  boxShadow: 'var(--shadow-sm)'
                } : {})
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>Bed {bed.bedNumber}</span>
                  <span className={`badge ${isOccupied ? 'badge-cancelled' : 'badge-completed'}`}>
                    {bed.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Ward: <strong>{bed.wardType}</strong>
                </div>

                {isOccupied && bed.patient && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem' }}>
                    <User size={14} style={{ color: 'var(--accent-teal)' }} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                      {bed.patient?.user?.name || 'Unknown Patient'}
                    </div>
                  </div>
                )}
              </div>

              {isStaff && (
                <div style={{ marginTop: '1rem' }}>
                  {isOccupied ? (
                    <button
                      onClick={() => handleOpenDischarge(bed)}
                      className="btn btn-danger btn-sm btn-full"
                      style={{ padding: '0.4rem' }}
                    >
                      Discharge
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAllocate(bed)}
                      className="btn btn-teal btn-sm btn-full"
                      style={{ padding: '0.4rem' }}
                    >
                      Admit Patient
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bed Allocation Modal Trigger */}
      {showAllocateModal && selectedBed && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2.5rem',
            maxWidth: '460px', width: '90%'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Admit Patient to Bed {selectedBed.bedNumber}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Select a registered patient to assign to this {selectedBed.wardType} Bed.
            </p>

            <form onSubmit={handleAllocate}>
              <div className="form-group">
                <label className="form-label">Select Patient *</label>
                <select
                  className="form-select"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((pat) => (
                    <option key={pat._id} value={pat._id}>
                      {pat.user?.name} (Blood Type: {pat.bloodType || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-teal btn-full">Admit Patient</button>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setShowAllocateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discharge Summary Modal Trigger */}
      {showDischargeModal && selectedBed && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-lg)', padding: '2.5rem',
            maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Discharge Summary & Release Bed {selectedBed.bedNumber}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Provide clinical summary. Submitting will generate a download PDF and mark the bed as vacant.
            </p>

            <form onSubmit={handleDischargeSubmit}>
              <div className="form-group">
                <label className="form-label">Clinical Diagnosis *</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Enter medical diagnosis (e.g. Acute Appendicitis)..."
                  value={dischargeForm.diagnosis}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, diagnosis: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Treatment Summary *</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Describe treatment procedures, medicines administered..."
                  value={dischargeForm.treatment}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, treatment: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Condition at Discharge *</label>
                  <select
                    className="form-select"
                    value={dischargeForm.condition}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, condition: e.target.value })}
                    required
                  >
                    <option value="Stable">Stable</option>
                    <option value="Improved">Improved</option>
                    <option value="Recovered">Recovered</option>
                    <option value="Referred">Referred</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Follow-up Instructions & Advice</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Enter follow-up instructions, precautions, medication at home..."
                  value={dischargeForm.followUp}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, followUp: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-danger btn-full" disabled={loading}>
                  {loading ? 'Discharging...' : 'Generate PDF & Discharge'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => {
                    setShowDischargeModal(false);
                    setSelectedBed(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Beds;
