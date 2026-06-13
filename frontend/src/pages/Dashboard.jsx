import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import StatCard from '../components/StatCard';
import Table from '../components/Table';
import { Link } from 'react-router-dom';
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
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [adminLedger, setAdminLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch data based on role
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

          // Show last 5 appointments
          setRecentAppointments(apps.slice(0, 5));
          setAdminLedger(bills);
        } else if (user.role === 'doctor') {
          const apps = await api.get('/appointments');
          const scripts = await api.get('/prescriptions');
          const pats = await api.get('/patients'); // To count overall if needed, or filter unique patients

          // Filter unique patients for this doctor
          const myPatients = new Set(apps.map((a) => a.patient?._id)).size;

          setStats({
            appointments: apps.length,
            pendingAppointments: apps.filter((a) => a.status === 'pending').length,
            prescriptions: scripts.length,
            patients: myPatients,
          });
          setRecentAppointments(apps.slice(0, 5));
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

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard details...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user.name}</h1>
          <p className="page-subtitle">Here is what's happening at CareHMS today</p>
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
          />
          <StatCard
            title="Total Patients"
            value={stats.patients}
            icon={<Users size={24} />}
            colorClass="teal"
          />
          <StatCard
            title="Appointments"
            value={stats.appointments}
            icon={<Calendar size={24} />}
            colorClass="warning"
          />
          <StatCard
            title="Total Earnings"
            value={`₹${stats.earnings}`}
            icon={<CreditCard size={24} />}
            colorClass="danger"
          />
        </div>
      )}

      {/* Doctor Stat Grid */}
      {user.role === 'doctor' && (
        <div className="dashboard-grid">
          <StatCard
            title="My Appointments"
            value={stats.appointments}
            icon={<Calendar size={24} />}
            colorClass="blue"
          />
          <StatCard
            title="Pending Approval"
            value={stats.pendingAppointments}
            icon={<Activity size={24} />}
            colorClass="warning"
          />
          <StatCard
            title="Prescriptions Issued"
            value={stats.prescriptions}
            icon={<FileText size={24} />}
            colorClass="teal"
          />
          <StatCard
            title="Unique Patients"
            value={stats.patients}
            icon={<Users size={24} />}
            colorClass="danger"
          />
        </div>
      )}

      {/* Patient Stat Grid */}
      {user.role === 'patient' && (
        <div className="dashboard-grid">
          <StatCard
            title="My Bookings"
            value={stats.appointments}
            icon={<Calendar size={24} />}
            colorClass="blue"
          />
          <StatCard
            title="Prescriptions"
            value={stats.prescriptions}
            icon={<FileText size={24} />}
            colorClass="teal"
          />
          <StatCard
            title="Unpaid Invoices"
            value={stats.unpaidBills}
            icon={<CreditCard size={24} />}
            colorClass="danger"
          />
        </div>
      )}

      {/* Recent Activity Section */}
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
                ? ['Doctor', 'Date', 'Time Slot', 'Symptoms', 'Status']
                : ['Patient', 'Date', 'Time Slot', 'Symptoms', 'Status']
            }
          >
            {recentAppointments.map((app) => (
              <tr key={app._id}>
                {user.role === 'patient' ? (
                  <td>{app.doctor?.user?.name || 'N/A'}</td>
                ) : (
                  <td>{app.patient?.user?.name || 'N/A'}</td>
                )}
                <td>{new Date(app.date).toLocaleDateString()}</td>
                <td>{app.timeSlot}</td>
                <td>{app.symptoms}</td>
                <td>
                  <span className={`badge badge-${app.status}`}>{app.status}</span>
                </td>
              </tr>
            ))}
          </Table>
        )}
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
                  <td>{bill.patient?.user?.name || 'N/A'}</td>
                  <td style={{ fontWeight: 600 }}>₹{bill.total}</td>
                  <td>{bill.paymentMethod || 'N/A'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{bill.transactionId || 'N/A'}</td>
                  <td>
                    <span className={`badge badge-${bill.status}`}>{bill.status}</span>
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
