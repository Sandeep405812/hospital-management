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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

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

  const handlePrint = async () => {
    if (!selectedBill) return;

    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #1e293b; background-color: #ffffff; width: 700px; margin: 0 auto;">
        <!-- Header -->
        <div style="border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="color: #0d9488; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">CAREHMS HOSPITALS</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-style: italic;">Next-Gen Healthcare Management Ecosystem</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; color: #0f766e; font-size: 16px; font-weight: 700;">INVOICE RECEIPT</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600;">#INV-${selectedBill._id.slice(-6).toUpperCase()}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Date: ${new Date(selectedBill.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <!-- Demographics Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #0f766e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">PATIENT DETAILS</h4>
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0f172a;">${selectedBill.patient?.user?.name || 'N/A'}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">Email: ${selectedBill.patient?.user?.email || 'N/A'}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Phone: ${selectedBill.patient?.user?.phoneNumber || 'N/A'}</p>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #0f766e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">CONSULTATION DETAILS</h4>
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0f172a;">Dr. ${selectedBill.appointment?.doctor?.user?.name || 'Physician'}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">Department: ${selectedBill.appointment?.department?.name || 'General Medicine'}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Payment Method: ${selectedBill.paymentMethod || 'Online'}</p>
          </div>
        </div>

        <!-- Ledger Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px 0; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Description</th>
              <th style="padding: 10px 0; text-align: right; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 15px 0;">
                <div style="font-size: 13px; font-weight: 600; color: #0f172a;">Doctor Consultation Fee</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Consultation Date: ${new Date(selectedBill.appointment?.date || selectedBill.createdAt).toLocaleDateString()}</div>
              </td>
              <td style="padding: 15px 0; text-align: right; font-size: 13px; font-weight: 600; color: #0f172a;">₹${selectedBill.amount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-size: 12px; color: #475569;">Central GST (9%) & State GST (9%)</td>
              <td style="padding: 10px 0; text-align: right; font-size: 12px; color: #475569;">₹${selectedBill.tax}</td>
            </tr>
            <tr style="border-top: 2px solid #cbd5e1; font-weight: 700;">
              <td style="padding: 15px 0; font-size: 14px; color: #0f172a;">Grand Total Amount Paid</td>
              <td style="padding: 15px 0; text-align: right; font-size: 16px; color: #0d9488;">₹${selectedBill.total}</td>
            </tr>
          </tbody>
        </table>

        <!-- Footer -->
        <div style="margin-top: 60px; border-top: 1px solid #f1f5f9; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 10px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0; font-weight: 600; color: #64748b;">CareHMS Medical Systems</p>
            <p style="margin: 2px 0 0 0;">This is a computer generated invoice and does not require a physical signature.</p>
          </div>
          <div style="text-align: center; width: 160px;">
            <div style="border-bottom: 1px solid #cbd5e1; margin-bottom: 6px; height: 30px;"></div>
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #334155;">Billing Department</p>
            <p style="margin: 2px 0 0 0; font-size: 9px; color: #94a3b8;">Authorized Signatory</p>
          </div>
        </div>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `Invoice_${selectedBill._id.slice(-6).toUpperCase()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error('Failed to generate PDF', err);
      window.print();
    }
  };

  const filteredBills = bills.filter((bill) => {
    const patientName = bill.patient?.user?.name || '';
    const doctorName = bill.appointment?.doctor?.user?.name || '';
    const matchesSearch = 
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctorName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'All' || bill.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

      {/* Search & Filter Controls */}
      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap',
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
        padding: '1rem', borderRadius: 'var(--border-radius)', alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            className="form-input"
            style={{ margin: 0, width: '100%' }}
            placeholder="Search by patient or doctor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ width: '180px' }}>
          <select
            className="form-select"
            style={{ margin: 0 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Invoices</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
        {(searchQuery || statusFilter !== 'All') && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('All');
            }}
          >
            Reset
          </button>
        )}
      </div>

      <div className="dashboard-section">
        {filteredBills.length === 0 ? (
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
            {filteredBills.map((bill) => (
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
