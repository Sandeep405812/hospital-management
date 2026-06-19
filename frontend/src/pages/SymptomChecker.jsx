import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, Heart, Search, HelpCircle, ArrowRight } from 'lucide-react';

const SymptomChecker = () => {
  const navigate = useNavigate();
  const [symptomsText, setSymptomsText] = useState('');
  const [departments, setDepartments] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await api.get('/departments');
        setDepartments(data);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepts();
  }, []);

  const handleCheck = (e) => {
    e.preventDefault();
    if (!symptomsText.trim()) return;

    const query = symptomsText.toLowerCase();

    // 1. Severity Analyzer
    const emergencyKeywords = [
      'chest pain', 'shortness of breath', 'difficulty breathing', 
      'stroke', 'paralysis', 'slurred speech', 'loss of consciousness', 
      'severe bleeding', 'sudden weakness', 'heart attack'
    ];
    
    let severity = 'Low';
    let warning = '';

    const hasEmergency = emergencyKeywords.some(keyword => query.includes(keyword));
    if (hasEmergency) {
      severity = 'CRITICAL';
      warning = 'EMERGENCY WARNING: Your symptoms suggest a potentially life-threatening condition. Please call emergency services (like 102/112) or visit the nearest ER immediately. Do not wait for an online appointment!';
    } else if (
      query.includes('fever') && (query.includes('severe') || query.includes('high') || query.includes('vomit') || query.includes('diarrhea')) ||
      query.includes('migraine') || query.includes('severe pain') || query.includes('fracture') || query.includes('injury')
    ) {
      severity = 'Medium';
      warning = 'Urgent Consultation: We recommend scheduling an appointment within 24-48 hours. If symptoms worsen, please seek immediate outpatient medical care.';
    } else {
      severity = 'Low';
      warning = 'Non-Urgent: These symptoms can usually be treated during a standard consultation. Book an appointment below to speak with a physician.';
    }

    // 2. Specialty mapping
    let recommendedDept = 'General Medicine';
    let explanation = 'Based on your symptoms, a General Medicine practitioner is best suited for your initial assessment. They can refer you to specialists if needed.';

    if (query.includes('heart') || query.includes('cardio') || query.includes('palpitations') || query.includes('bp') || query.includes('blood pressure')) {
      recommendedDept = 'Cardiology';
      explanation = 'Cardiologists specialize in cardiovascular health, heart conditions, blood pressure management, and chest anomalies.';
    } else if (query.includes('ear') || query.includes('throat') || query.includes('nose') || query.includes('sinus') || query.includes('cough') || query.includes('hearing') || query.includes('tonsil')) {
      recommendedDept = 'ENT';
      explanation = 'Otolaryngologists (ENT specialists) focus on conditions of the ears, nose, sinuses, throat, larynx, and vocal cords.';
    } else if (query.includes('skin') || query.includes('rash') || query.includes('acne') || query.includes('itch') || query.includes('eczema') || query.includes('dermatology') || query.includes('hair')) {
      recommendedDept = 'Dermatology';
      explanation = 'Dermatologists deal with skin, hair, and nail health, including rashes, allergies, infections, acne, and chronic skin conditions.';
    } else if (query.includes('tooth') || query.includes('teeth') || query.includes('gum') || query.includes('dental') || query.includes('dentist') || query.includes('cavity')) {
      recommendedDept = 'Dental';
      explanation = 'Dentists diagnose and treat oral health conditions, including cavities, gum problems, and toothaches.';
    } else if (query.includes('child') || query.includes('baby') || query.includes('kid') || query.includes('pediatrician') || query.includes('vaccination')) {
      recommendedDept = 'Pediatrics';
      explanation = 'Pediatricians specialize in the physical, behavioral, and mental health of infants, children, and teenagers.';
    } else if (query.includes('bone') || query.includes('fracture') || query.includes('joint') || query.includes('muscle') || query.includes('sprain') || query.includes('knee') || query.includes('back pain')) {
      recommendedDept = 'Orthopedics';
      explanation = 'Orthopedic specialists treat skeletal and muscular issues, including fractures, joint degeneration, sports injuries, and back pain.';
    }

    // Find actual department ID in the database
    const matchedDept = departments.find(d => 
      d.name.toLowerCase().includes(recommendedDept.toLowerCase()) || 
      recommendedDept.toLowerCase().includes(d.name.toLowerCase())
    );

    setResult({
      severity,
      warning,
      recommendedDept: matchedDept ? matchedDept.name : recommendedDept,
      deptId: matchedDept ? matchedDept._id : null,
      explanation
    });
  };

  const handleBookRedirect = () => {
    // Navigate to appointments and pass state to open modal pre-filled
    navigate('/appointments', { 
      state: { 
        openBooking: true, 
        departmentId: result.deptId 
      } 
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Symptom Checker</h1>
          <p className="page-subtitle">Analyze symptoms and identify the right specialist doctor</p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '1.5rem auto 0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Symptom Input Card */}
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '2rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
            <Search size={20} />
            <span>Describe What You Are Feeling</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Enter your symptoms in detail (e.g. "I have had a high fever since yesterday, with a sore throat and wet cough"). Our assistant will suggest the best department.
          </p>

          <form onSubmit={handleCheck}>
            <textarea
              className="form-textarea"
              style={{ minHeight: '120px', fontSize: '0.95rem', padding: '1rem', marginBottom: '1.25rem', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
              placeholder="Type your symptoms here..."
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
              required
            />
            
            <button type="submit" className="btn btn-primary btn-full" style={{ padding: '0.75rem 1rem' }}>
              Check Symptoms & Suggest Specialty
            </button>
          </form>
        </div>

        {/* Diagnostic Results Card */}
        {result && (
          <div style={{ 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--glass-border)', 
            padding: '2rem', 
            borderRadius: 'var(--border-radius)', 
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 0.4s ease-out'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Assessment Results
            </h2>

            {/* Severity Alert Box */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              padding: '1.25rem', 
              borderRadius: 'var(--border-radius-sm)', 
              marginBottom: '1.5rem',
              backgroundColor: result.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : result.severity === 'Medium' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              borderLeft: `4px solid ${result.severity === 'CRITICAL' ? 'var(--danger)' : result.severity === 'Medium' ? 'var(--warning)' : 'var(--success)'}`
            }}>
              <div style={{ color: result.severity === 'CRITICAL' ? 'var(--danger)' : result.severity === 'Medium' ? 'var(--warning)' : 'var(--success)' }}>
                {result.severity === 'CRITICAL' ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', color: result.severity === 'CRITICAL' ? 'var(--danger)' : result.severity === 'Medium' ? 'var(--warning)' : 'var(--success)' }}>
                  Severity Level: {result.severity}
                </p>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                  {result.warning}
                </p>
              </div>
            </div>

            {/* Recommended Specialty Details */}
            <div style={{ padding: '1.25rem', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'rgba(255, 255, 255, 0.01)', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recommended Department
              </p>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-teal)', margin: '0.25rem 0 0.75rem 0' }}>
                {result.recommendedDept}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {result.explanation}
              </p>
            </div>

            {/* Booking CTA Button (if not critical) */}
            {result.severity !== 'CRITICAL' && (
              <button 
                onClick={handleBookRedirect}
                className="btn btn-teal btn-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
              >
                <span>Book Appointment in {result.recommendedDept}</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default SymptomChecker;
