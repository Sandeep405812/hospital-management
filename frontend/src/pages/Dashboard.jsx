import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_URL } from '../utils/api';
import StatCard from '../components/StatCard';
import Table from '../components/Table';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  Layers,
  Activity,
  PlusCircle,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    doctors: 0,
    patients: 0,
    appointments: 0,
    earnings: 0,
    departments: 0,
    prescriptions: 0,
    unpaidBills: 0,
    pendingAppointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [adminLedger, setAdminLedger] = useState([]);
  const [billingAnalytics, setBillingAnalytics] = useState(null);
  const [appointmentAnalytics, setAppointmentAnalytics] = useState(null);
  const [myDoctorProfile, setMyDoctorProfile] = useState(null);
  const [topDoctors, setTopDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Donut hover segment tracking
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState(null);

  // Initialize socket for live queue updates
  useEffect(() => {
    if (user && user.role === 'doctor') {
      let socketUrl = BACKEND_URL;
      try {
        socketUrl = new URL(BACKEND_URL).origin;
      } catch (e) {
        console.warn("Invalid BACKEND_URL:", BACKEND_URL);
      }
      const newSocket = io(socketUrl);
      setSocket(newSocket);
      return () => newSocket.disconnect();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (user.role === 'admin') {
        const docs = await api.get('/doctors');
        const pats = await api.get('/patients');
        const apps = await api.get('/appointments');
        const depts = await api.get('/departments');
        const bills = await api.get('/billing');

        const totalEarnings = bills
          .filter((b) => b.status === 'paid')
          .reduce((sum, b) => sum + b.total, 0);

        setStats({
          doctors: docs.length,
          patients: pats.length,
          appointments: apps.length,
          earnings: totalEarnings,
          departments: depts.length,
        });

        setRecentAppointments(apps.slice(0, 5));
        setAdminLedger(bills.slice(0, 5));

        // Top Doctors by Appointments calculation
        const docCounts = {};
        apps.forEach((app) => {
          if (app.doctor && app.doctor.user) {
            const name = app.doctor.user.name;
            docCounts[name] = (docCounts[name] || 0) + 1;
          }
        });
        const sortedDocs = Object.entries(docCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        setTopDoctors(sortedDocs);

        // Fetch Analytics
        const bAnalytics = await api.get('/billing/analytics');
        const aAnalytics = await api.get('/appointments/analytics');
        setBillingAnalytics(bAnalytics);
        setAppointmentAnalytics(aAnalytics);
      } else if (user.role === 'doctor') {
        const apps = await api.get('/appointments');
        const scripts = await api.get('/prescriptions');
        const docs = await api.get('/doctors');
        
        const myDoc = docs.find((d) => d.user?._id === user._id);
        if (myDoc) {
          setMyDoctorProfile(myDoc);
        }

        const myPatients = new Set(apps.map((a) => a.patient?._id)).size;

        setStats({
          appointments: apps.length,
          pendingAppointments: apps.filter((a) => a.status === 'pending').length,
          prescriptions: scripts.length,
          patients: myPatients,
        });
        setRecentAppointments(apps.slice(0, 10));

        // Fetch Analytics
        const aAnalytics = await api.get('/appointments/analytics');
        setAppointmentAnalytics(aAnalytics);
      } else if (user.role === 'patient') {
        const apps = await api.get('/appointments');
        const scripts = await api.get('/prescriptions');
        const bills = await api.get('/billing');

        const unpaidCount = bills.filter((b) => b.status === 'unpaid').length;

        setStats({
          appointments: apps.length,
          prescriptions: scripts.length,
          unpaidBills: unpaidCount,
        });
        setRecentAppointments(apps.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleCallNextPatient = async () => {
    if (!myDoctorProfile) return;

    const today = new Date().toDateString();
    const todayApps = recentAppointments.filter(
      (app) =>
        app.status === 'approved' &&
        new Date(app.date).toDateString() === today
    );

    if (todayApps.length === 0) {
      alert('No more approved appointments scheduled for today!');
      return;
    }

    const nextApp = todayApps[0];
    const nextTokenNum = nextApp.queuePosition || (myDoctorProfile.currentToken || 0) + 1;

    try {
      setLoading(true);
      await api.put(`/appointments/${nextApp._id}/status`, { status: 'ongoing' });
      await api.put(`/doctors/${myDoctorProfile._id}/queue`, { currentToken: nextTokenNum });

      if (socket) {
        socket.emit('update-queue', { doctorId: myDoctorProfile._id });
      }

      alert(`Called Patient: ${nextApp.patient?.user?.name || 'Patient'} (Token #${nextTokenNum})`);
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to call next patient');
      setLoading(false);
    }
  };

  // GSAP Entrance Animations
  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.page-title, .page-subtitle', 
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 }
      );
      
      gsap.fromTo('.stat-card', 
        { opacity: 0, y: 30, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.2)', stagger: 0.08 }
      );
      
      gsap.fromTo('.dashboard-section, .chart-card', 
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15 }
      );
    }
  }, [loading]);

  // Curved Area SVG Chart with Gradient and Month-over-Month targets
  const renderRevenueChart = () => {
    if (!billingAnalytics || !billingAnalytics.monthlyRevenue) return null;
    const data = Object.entries(billingAnalytics.monthlyRevenue);
    if (data.length === 0) return null;

    const width = 500;
    const height = 220;
    const paddingX = 45;
    const paddingY = 40;

    const values = data.map(([_, val]) => val);
    const maxVal = Math.max(...values, 1000);
    const minVal = 0;

    const chartWidth = width - 2 * paddingX;
    const chartHeight = height - 2 * paddingY;

    // Map monthly points to SVG coordinates
    const points = data.map(([month, val], idx) => {
      const x = paddingX + (idx / (data.length - 1 || 1)) * chartWidth;
      const y = height - paddingY - (val / maxVal) * chartHeight;
      return { x, y, month, val };
    });

    // Create cubic bezier curve path
    let lineD = '';
    let targetD = '';
    if (points.length > 0) {
      lineD = `M ${points[0].x},${points[0].y}`;
      targetD = `M ${points[0].x},${points[0].y - 8}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;
        lineD += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p1.x},${p1.y}`;

        // Target MoM projection slightly higher
        const targetY1 = p0.y - 12;
        const targetY2 = p1.y - 12;
        targetD += ` C ${cpX1},${targetY1} ${cpX2},${targetY2} ${p1.x},${p1.y - 10}`;
      }
    }

    const areaD = points.length > 0 ? `${lineD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z` : '';

    return (
      <div className="chart-card" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Monthly Revenue Trend</h3>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-blue)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }}></span> Revenue
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
              <span style={{ width: '8px', height: '2px', backgroundColor: 'var(--text-muted)', borderStyle: 'dashed' }}></span> MoM Target
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.03)" />
          <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="rgba(255,255,255,0.03)" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.08)" />

          {/* Render Area fill */}
          {areaD && <path d={areaD} fill="url(#areaGradient)" />}

          {/* Target Dashed projection Line */}
          {targetD && <path d={targetD} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4 4" />}

          {/* Smooth Revenue Line */}
          {lineD && <path d={lineD} fill="none" stroke="var(--accent-blue)" strokeWidth="3" strokeLinecap="round" />}

          {/* Render Interactive Nodes */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="5" 
                fill="#0f172a" 
                stroke="var(--accent-blue)" 
                strokeWidth="2.5" 
                style={{ cursor: 'pointer', transition: 'var(--transition-smooth)' }}
              />
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">
                ₹{p.val.toLocaleString('en-IN')}
              </text>
              <text x={p.x} y={height - 15} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">
                {p.month.slice(-2)}/{p.month.slice(2, 4)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Upgraded Donut Chart with center total count label and segment hover widths
  const renderStatusDonutChart = () => {
    if (!appointmentAnalytics || !appointmentAnalytics.statusCounts) return null;
    const counts = appointmentAnalytics.statusCounts;
    const total = appointmentAnalytics.totalCount || 0;

    if (total === 0) return null;

    const items = [
      { key: 'completed', color: 'var(--success)', label: 'Completed' },
      { key: 'approved', color: '#3b82f6', label: 'Approved' },
      { key: 'pending', color: 'var(--warning)', label: 'Pending' },
      { key: 'cancelled', color: 'var(--danger)', label: 'Cancelled' }
    ].filter(item => (counts[item.key] || 0) > 0);

    const radius = 45;
    const circum = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
      <div className="chart-card" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Appointment Statuses</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center', flexGrow: 1, minHeight: '140px' }}>
          <div style={{ position: 'relative', width: '130px', height: '130px' }}>
            <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
              
              {items.map((item) => {
                const count = counts[item.key] || 0;
                const percent = count / total;
                const strokeLength = percent * circum;
                const strokeOffset = circum - strokeLength + (accumulatedPercent * circum);
                accumulatedPercent -= percent;
                const isHovered = hoveredDonutSegment === item.key;

                return (
                  <circle
                    key={item.key}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={isHovered ? 14 : 10}
                    strokeDasharray={`${strokeLength} ${circum}`}
                    strokeDashoffset={strokeOffset}
                    style={{ transition: 'stroke-width 0.2s, stroke 0.2s', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDonutSegment(item.key)}
                    onMouseLeave={() => setHoveredDonutSegment(null)}
                  />
                );
              })}
            </svg>

            {/* Centered Donut Total label */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                {hoveredDonutSegment ? hoveredDonutSegment : 'TOTAL'}
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', display: 'block', lineHeight: 1 }}>
                {hoveredDonutSegment ? counts[hoveredDonutSegment] : total}
              </span>
            </div>
          </div>

          {/* Ratios Legenda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            {items.map((item) => {
              const pct = Math.round(((counts[item.key] || 0) / total) * 100);
              return (
                <div 
                  key={item.key} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    opacity: hoveredDonutSegment && hoveredDonutSegment !== item.key ? 0.4 : 1,
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={() => setHoveredDonutSegment(item.key)}
                  onMouseLeave={() => setHoveredDonutSegment(null)}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }}></span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{counts[item.key]}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.label} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Top Doctors horizontal progress load indicators
  const renderTopDoctorsChart = () => {
    if (user.role !== 'admin') return null;
    const maxAppointments = topDoctors.length > 0 ? Math.max(...topDoctors.map(d => d.count)) : 10;
    
    return (
      <div className="chart-card" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Top Doctors by Consultations</h3>
        {topDoctors.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No doctor activity recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center', height: '80%' }}>
            {topDoctors.map((doc, idx) => {
              const pct = Math.round((doc.count / maxAppointments) * 100);
              const barColors = [
                'linear-gradient(to right, #3b82f6, #06b6d4)',
                'linear-gradient(to right, #10b981, #14b8a6)',
                'linear-gradient(to right, #f59e0b, #f97316)'
              ];
              const gradient = barColors[idx % barColors.length];
              
              return (
                <div key={doc.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{doc.name}</span>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{doc.count} Appts</span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: gradient, borderRadius: '4px', transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDepartmentLoads = () => {
    if (!appointmentAnalytics || !appointmentAnalytics.departmentCounts) return null;
    const depts = Object.entries(appointmentAnalytics.departmentCounts);
    const total = appointmentAnalytics.totalCount || 1;
    if (depts.length === 0) return null;

    return (
      <div className="chart-card" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Department Loads</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', height: '80%' }}>
          {depts.slice(0, 4).map(([name, count]) => {
            const percentage = Math.round((count / total) * 100);
            return (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{count} ({percentage}%)</span>
                </div>
                <div style={{ height: '8px', width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: 'var(--accent-teal)', borderRadius: '4px' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper to extract initials for user avatars
  const getInitials = (name) => {
    if (!name) return 'PT';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Loading Skeletons layout (renders instead of blank screen loader)
  if (loading && recentAppointments.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2.5rem' }}>
          <div className="skeleton-line" style={{ width: '280px', height: '32px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}></div>
          <div className="skeleton-line" style={{ width: '380px', height: '18px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', marginTop: '0.5rem' }}></div>
        </div>
        
        {/* Stat card Skeletons */}
        <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ height: '120px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ width: '90px', height: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px' }}></div>
                <div style={{ width: '55px', height: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}></div>
              </div>
              <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}></div>
            </div>
          ))}
        </div>

        {/* Table Skeletons */}
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '2rem', height: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ width: '180px', height: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>
            <div style={{ width: '80px', height: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ width: '120px', height: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>
                <div style={{ width: '90px', height: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>
                <div style={{ width: '90px', height: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>
                <div style={{ width: '60px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '9999px' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: '800' }}>Welcome back, {user.name}</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>Here is what's happening at AS HOSPITAL today</p>
        </div>
        {user.role === 'patient' && (
          <Link to="/appointments" className="btn btn-primary">
            <PlusCircle size={18} />
            <span>Book Appointment</span>
          </Link>
        )}
      </div>

      {/* Admin Stat Grid */}
      {user.role === 'admin' && (
        <div className="dashboard-grid">
          <StatCard
            title="Total Doctors"
            value={stats.doctors}
            icon={<Activity size={24} />}
            colorClass="blue"
            change="4.2%"
            isIncrease={true}
            description="active this week"
          />
          <StatCard
            title="Total Patients"
            value={stats.patients}
            icon={<Users size={24} />}
            colorClass="teal"
            change="12%"
            isIncrease={true}
            description="new patient logs"
          />
          <StatCard
            title="Appointments"
            value={stats.appointments}
            icon={<Calendar size={24} />}
            colorClass="warning"
            change="8.5%"
            isIncrease={true}
            description="scheduled today"
          />
          <StatCard
            title="Total Earnings"
            value={`₹${stats.earnings.toLocaleString('en-IN')}`}
            icon={<CreditCard size={24} />}
            colorClass="danger"
            change="15%"
            isIncrease={true}
            description="this billing cycle"
          />
        </div>
      )}

      {/* Doctor Stat Grid */}
      {user.role === 'doctor' && (
        <>
          <div className="dashboard-grid">
            <StatCard
              title="My Appointments"
              value={stats.appointments}
              icon={<Calendar size={24} />}
              colorClass="blue"
              change="5%"
              isIncrease={true}
              description="all scheduled"
            />
            <StatCard
              title="Pending Approval"
              value={stats.pendingAppointments}
              icon={<Activity size={24} />}
              colorClass="warning"
              change={`${stats.pendingAppointments}`}
              isIncrease={stats.pendingAppointments > 0 ? false : true}
              description="action required"
            />
            <StatCard
              title="Prescriptions Issued"
              value={stats.prescriptions}
              icon={<FileText size={24} />}
              colorClass="teal"
              change="8%"
              isIncrease={true}
              description="issued"
            />
            <StatCard
              title="Unique Patients"
              value={stats.patients}
              icon={<Users size={24} />}
              colorClass="danger"
              change="14%"
              isIncrease={true}
              description="consulted"
            />
          </div>

          {/* Live Queue Controller for Doctor */}
          {myDoctorProfile && (
            <div style={{
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius-lg)', padding: '2rem', marginTop: '2rem',
              boxShadow: 'var(--shadow-md)', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-teal)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  LIVE CLINIC QUEUE CONTROLLER
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0', color: '#fff' }}>
                  Now Serving Token: <span style={{ color: 'var(--accent-teal)' }}>#{myDoctorProfile.currentToken || 0}</span>
                </h3>
                {(() => {
                  const today = new Date().toDateString();
                  const nextPending = recentAppointments.find(
                    (app) => app.status === 'approved' && new Date(app.date).toDateString() === today
                  );
                  if (nextPending) {
                    return (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                        Next Patient: <strong>{nextPending.patient?.user?.name}</strong> (Est. Token: #{nextPending.queuePosition || 'N/A'}, Time: {nextPending.timeSlot})
                      </p>
                    );
                  }
                  return (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                      No more pending patients checked-in for today.
                    </p>
                  );
                })()}
              </div>
              <div>
                <button
                  onClick={handleCallNextPatient}
                  className="btn btn-teal"
                  style={{
                    padding: '0.75rem 2rem', fontWeight: 700,
                    boxShadow: '0 4px 15px rgba(20, 184, 166, 0.25)'
                  }}
                  disabled={loading}
                >
                  Call Next Patient
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Patient Stat Grid */}
      {user.role === 'patient' && (
        <div className="dashboard-grid">
          <StatCard
            title="My Bookings"
            value={stats.appointments}
            icon={<Calendar size={24} />}
            colorClass="blue"
            change="2"
            isIncrease={true}
            description="upcoming visits"
          />
          <StatCard
            title="Prescriptions"
            value={stats.prescriptions}
            icon={<FileText size={24} />}
            colorClass="teal"
            change="1"
            isIncrease={true}
            description="active orders"
          />
          <StatCard
            title="Unpaid Invoices"
            value={stats.unpaidBills}
            icon={<CreditCard size={24} />}
            colorClass="danger"
            change={stats.unpaidBills > 0 ? "1" : "0"}
            isIncrease={stats.unpaidBills > 0 ? false : true}
            description="invoice checks"
          />
        </div>
      )}

      {/* Admin Visual Charts Section (Curved area, Donut, Top Doctors horizontal bars) */}
      {user.role === 'admin' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '2rem', 
          marginTop: '2rem', 
          marginBottom: '2rem' 
        }}>
          {renderRevenueChart()}
          {renderStatusDonutChart()}
          {renderTopDoctorsChart()}
        </div>
      )}

      {/* Doctor Visual Charts Section */}
      {user.role === 'doctor' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
          {renderStatusDonutChart()}
          {renderDepartmentLoads()}
        </div>
      )}

      {/* Recent Appointments table (Initials, coloured pills, row hover actions) */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Recent Appointments</h2>
          <Link
            to="/appointments"
            style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', fontWeight: 600 }}
          >
            View All
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
            No appointments found.
          </p>
        ) : (
          <Table
            headers={
              user.role === 'patient'
                ? ['Doctor', 'Date', 'Time Slot', 'Symptoms', 'Status', 'Actions']
                : ['Patient', 'Date', 'Time Slot', 'Symptoms', 'Status', 'Actions']
            }
          >
            {recentAppointments.map((app) => {
              const participantName = user.role === 'patient' 
                ? (app.doctor?.user?.name || 'Doctor') 
                : (app.patient?.user?.name || 'Patient');
              return (
                <tr key={app._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Circle Initials Avatar */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        color: 'var(--accent-blue)',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        overflow: 'hidden'
                      }}>
                        {getInitials(participantName)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{participantName}</span>
                    </div>
                  </td>
                  <td>{new Date(app.date).toLocaleDateString()}</td>
                  <td>{app.timeSlot}</td>
                  <td>{app.symptoms}</td>
                  <td>
                    <span className={`badge badge-${app.status}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    {/* Hover visible actions */}
                    <div className="row-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link to="/appointments" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                        View
                      </Link>
                      {user.role !== 'patient' && (
                        <Link to="/appointments" className="btn btn-teal btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                          Edit
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>

      {/* Medicine & Doctors Spotlight Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
        
        {/* Medicine Catalog Section */}
        <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>💊</span> <span>Pharmacy Specials</span>
            </h3>
            <Link to="/store" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600 }}>Visit E-Store</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { name: 'Paracetamol 500mg', price: 40, category: 'Pain & Fever Relief', desc: 'Relief from fevers and mild body aches.' },
              { name: 'Limcee Vitamin C 500mg', price: 65, category: 'Wellness & Immunity', desc: 'Chewable tablets for daily immunity support.' },
              { name: 'Torex Cough Syrup 100ml', price: 95, category: 'Cough & Cold', desc: 'Bronchial formula for dry cough relief.' }
            ].map((med, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius)' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--accent-teal)', fontWeight: 700, textTransform: 'uppercase' }}>{med.category}</span>
                  <h4 style={{ fontSize: '0.9rem', margin: '0.1rem 0', fontWeight: 700, color: 'var(--text-primary)' }}>{med.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{med.desc}</p>
                </div>
                <div style={{ textAlign: 'right', minWidth: '75px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent-teal)', display: 'block' }}>₹{med.price}</span>
                  <Link to="/store" style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 700, textDecoration: 'none' }}>Order Now</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doctors Card Spotlight Section */}
        <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🩺</span> <span>Medical Specialists</span>
            </h3>
            {user.role !== 'doctor' ? (
              <Link to="/doctors" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600 }}>See All Doctors</Link>
            ) : (
              <Link to="/patients" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600 }}>See All Patients</Link>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { name: 'Dr. Sandeep Singh', specialty: 'General Physician', exp: '12 Yrs Exp', fee: 500, rating: '⭐ 4.9' },
              { name: 'Dr. Priya Sharma', specialty: 'Pediatrician', exp: '8 Yrs Exp', fee: 600, rating: '⭐ 4.8' },
              { name: 'Dr. Rajesh Patel', specialty: 'Cardiologist', exp: '15 Yrs Exp', fee: 800, rating: '⭐ 5.0' }
            ].map((doc, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius)', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  {doc.name.split(' ').slice(1).map(n => n[0]).join('') || 'Dr'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{doc.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 700 }}>{doc.rating}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.1rem 0' }}>{doc.specialty} • {doc.exp}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fee: ₹{doc.fee}</span>
                    {user.role === 'patient' && (
                      <Link to="/appointments" style={{ fontSize: '0.7rem', color: 'var(--accent-teal)', fontWeight: 700 }}>Book Consult</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Admin Financial Audit Ledger Section */}
      {user.role === 'admin' && (
        <div className="dashboard-section" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <h2 className="section-title">Admin Financial Audit Ledger</h2>
            <Link
              to="/billing"
              style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', fontWeight: 600 }}
            >
              View Invoices
            </Link>
          </div>

          {adminLedger.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
              No transactions recorded yet.
            </p>
          ) : (
            <Table headers={['Invoice ID', 'Patient Name', 'Amount', 'Payment Method', 'Transaction ID', 'Status']}>
              {adminLedger.map((bill) => (
                <tr key={bill._id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{bill._id.slice(-6).toUpperCase()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--accent-teal)',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        {getInitials(bill.patient?.user?.name)}
                      </div>
                      <span>{bill.patient?.user?.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{bill.total.toLocaleString('en-IN')}</td>
                  <td>{bill.paymentMethod || 'N/A'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{bill.transactionId || 'N/A'}</td>
                  <td>
                    <span className={`badge badge-${bill.status}`}>{bill.status === 'paid' ? 'Paid' : 'Unpaid'}</span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
