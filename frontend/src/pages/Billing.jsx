import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { CreditCard, Eye, Printer, Landmark } from 'lucide-react';

const Billing = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pay Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Card');

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchBills = async () => {
    try {
      const data = await api.get('/billing');
      setBills(data);
    } catch (error) {
      console.error('Failed to load bills:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await fetchBills();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleOpenPayModal = (bill) => {
    setSelectedBill(bill);
    setIsPayModalOpen(true);
  };

  const handleOpenDetails = (bill) => {
    setSelectedBill(bill);
    setIsDetailModalOpen(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/billing/${selectedBill._id}/pay`, { paymentMethod });
      setIsPayModalOpen(false);
      setSelectedBill(null);
      fetchBills();
      alert('Payment completed successfully!');
    } catch (error) {
      alert(error.message || 'Payment failed');
    }
  };

  const handleEditFee = async (bill) => {
    const newFee = prompt(`Enter new fee amount for ${bill.patient?.user?.name}'s invoice (subtotal):`, bill.amount);
    if (newFee === null) return;
    if (isNaN(newFee) || Number(newFee) <= 0) {
      alert('Please enter a valid positive number');
      return;
    }

    try {
      await api.put(`/billing/${bill._id}/amount`, { amount: Number(newFee) });
      fetchBills();
      alert('Invoice fee updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update fee');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading billing statements...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing & Invoices</h1>
          <p className="page-subtitle">Track consultation fees and payments</p>
        </div>
      </div>

      <div className="dashboard-section">
        {bills.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No billing invoices found.</p>
        ) : (
          <Table
            headers={[
              'Invoice Date',
              user.role === 'patient' ? 'Doctor / Consultation' : 'Patient Name',
              'Subtotal',
              'Tax (18%)',
              'Total Amount',
              'Payment Status',
              'Actions',
            ]}
          >
            {bills.map((bill) => (
              <tr key={bill._id}>
                <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                {user.role === 'patient' ? (
                  <td>
                    <div style={{ fontWeight: 600 }}>{bill.appointment?.doctor?.user?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Symptoms: {bill.appointment?.symptoms}
                    </div>
                  </td>
                ) : (
                  <td>
                    <div style={{ fontWeight: 600 }}>{bill.patient?.user?.name}</div>
                  </td>
                )}
                <td>₹{bill.amount}</td>
                <td>₹{bill.tax}</td>
                <td style={{ fontWeight: 700 }}>₹{bill.total}</td>
                <td>
                  <span className={`badge badge-${bill.status}`}>
                    {bill.status === 'paid' ? 'Fee Success' : 'Unpaid'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.35rem' }}
                      onClick={() => handleOpenDetails(bill)}
                    >
                      <Eye size={16} />
                    </button>
                    {user.role === 'patient' && bill.status === 'unpaid' && (
                      <Link to={`/billing/${bill._id}/checkout`} className="btn btn-teal btn-sm">
                        <CreditCard size={14} />
                        <span>Pay</span>
                      </Link>
                    )}
                    {user.role === 'admin' && bill.status === 'unpaid' && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleEditFee(bill)}
                      >
                        Edit Fee
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Payment Processing Modal */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Checkout Invoice">
        {selectedBill && (
          <form onSubmit={handleProcessPayment}>
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Consultation Fee:</span>
                <span>₹{selectedBill.amount}</span>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <span>GST (18%):</span>
                <span>₹{selectedBill.tax}</span>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                <span>Total Due:</span>
                <span style={{ color: 'var(--accent-teal)' }}>₹{selectedBill.total}</span>
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Card">Credit / Debit Card</option>
                <option value="UPI">UPI (GooglePay/PhonePe)</option>
                <option value="Insurance">Health Insurance Claims</option>
                <option value="Cash">Cash (At Counter)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-full" style={{ display: 'flex', gap: '0.5rem' }}>
              <Landmark size={18} />
              <span>Complete Transaction</span>
            </button>
          </form>
        )}
      </Modal>

      {/* Bill Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Invoice Receipt">
        {selectedBill && (
          <div id="print-area" style={{ padding: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid var(--accent-blue)',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ color: 'var(--accent-blue)', fontWeight: 800, margin: 0 }}>🏥 CareHMS</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hospital Consultation Receipt</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Invoice #: {selectedBill._id.slice(-6).toUpperCase()}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Date: {new Date(selectedBill.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Billed To:</p>
                <p><strong>{selectedBill.patient?.user?.name}</strong></p>
                <p>Email: {selectedBill.patient?.user?.email}</p>
                <p>Phone: {selectedBill.patient?.user?.phoneNumber || 'N/A'}</p>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Billing Summary:</p>
                <p><strong>Doctor:</strong> {selectedBill.appointment?.doctor?.user?.name}</p>
                <p><strong>Payment Status:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600, color: selectedBill.status === 'paid' ? 'var(--success)' : 'var(--danger)' }}>{selectedBill.status === 'paid' ? 'Fee Success' : 'Unpaid'}</span></p>
                {selectedBill.status === 'paid' && (
                  <>
                    <p><strong>Method:</strong> {selectedBill.paymentMethod}</p>
                    <p><strong>Txn ID:</strong> {selectedBill.transactionId}</p>
                  </>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.75rem 0' }}>
                      <strong>Doctor Consultation Fee</strong>
                      <br />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Department: {selectedBill.appointment?.department?.name || 'General'} (Date: {new Date(selectedBill.appointment?.date || Date.now()).toLocaleDateString()})
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>₹{selectedBill.amount}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>GST (18%)</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>₹{selectedBill.tax}</td>
                  </tr>
                  <tr style={{ borderTop: '2px solid var(--glass-border)', fontWeight: 700 }}>
                    <td style={{ padding: '0.75rem 0', fontSize: '1.1rem' }}>Total Amount Paid</td>
                    <td style={{ textAlign: 'right', fontSize: '1.1rem', color: 'var(--accent-teal)' }}>₹{selectedBill.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Billing;
