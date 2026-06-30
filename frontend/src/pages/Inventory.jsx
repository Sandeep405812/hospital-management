import React, { useState } from 'react';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Package, AlertTriangle, ArrowUpRight, Search, Plus } from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'Paracetamol 500mg', category: 'Oral Tablet', quantity: 180, reorderLevel: 50, expiryDate: '2028-12-31', status: 'In Stock' },
    { id: 2, name: 'Amoxicillin 250mg', category: 'Antibiotic', quantity: 24, reorderLevel: 50, expiryDate: '2026-08-15', status: 'Low Stock' },
    { id: 3, name: 'Surgical N95 Masks', category: 'Consumables', quantity: 450, reorderLevel: 100, expiryDate: '2029-02-28', status: 'In Stock' },
    { id: 4, name: 'Normal Saline 0.9% 500ml', category: 'IV Fluids', quantity: 15, reorderLevel: 30, expiryDate: '2027-10-10', status: 'Low Stock' },
    { id: 5, name: 'Insulin Glargine 100U', category: 'Hormones', quantity: 8, reorderLevel: 15, expiryDate: '2026-07-20', status: 'Low Stock' },
    { id: 6, name: 'Ibuprofen 400mg', category: 'Analgesic', quantity: 0, reorderLevel: 40, expiryDate: '2027-05-18', status: 'Out of Stock' }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Oral Tablet',
    quantity: 100,
    reorderLevel: 30,
    expiryDate: '',
  });

  const handleReorder = (id) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + 100;
        return {
          ...item,
          quantity: newQty,
          status: newQty > item.reorderLevel ? 'In Stock' : 'Low Stock'
        };
      }
      return item;
    }));
    alert('Simulated Restock Order Placed: +100 units added to ledger inventory!');
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    const qty = parseInt(newItem.quantity) || 0;
    const reorder = parseInt(newItem.reorderLevel) || 0;
    let status = 'In Stock';
    if (qty === 0) status = 'Out of Stock';
    else if (qty <= reorder) status = 'Low Stock';

    const itemToAdd = {
      id: Date.now(),
      name: newItem.name,
      category: newItem.category,
      quantity: qty,
      reorderLevel: reorder,
      expiryDate: newItem.expiryDate || '2028-12-31',
      status: status
    };

    setItems([...items, itemToAdd]);
    setIsAddModalOpen(false);
    setNewItem({ name: '', category: 'Oral Tablet', quantity: 100, reorderLevel: 30, expiryDate: '' });
    alert('New medical stock registered successfully.');
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = items.filter(i => i.quantity <= i.reorderLevel);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pharmacy & Inventory Stock Ledger</h1>
          <p className="page-subtitle">Track drug availability, consumables, and trigger restock orders</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} />
          <span>Register Stock Item</span>
        </button>
      </div>

      {/* Critical Warnings Panel */}
      {lowStockItems.length > 0 && (
        <div style={{
          background: 'rgba(234, 88, 12, 0.08)',
          border: '1px solid var(--warning)',
          padding: '1.25rem',
          borderRadius: 'var(--border-radius)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 800 }}>
            <AlertTriangle size={18} />
            <span>CRITICAL ATTENTION REQUIRED: {lowStockItems.length} ITEMS DEPLATING</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            The following essential medicines/equipments are running below safe threshold levels. Click reorder to restock.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {lowStockItems.map(item => (
              <span key={item.id} style={{
                fontSize: '0.75rem', fontWeight: 'bold',
                backgroundColor: item.quantity === 0 ? 'rgba(225, 29, 72, 0.15)' : 'rgba(234, 88, 12, 0.15)',
                color: item.quantity === 0 ? 'var(--danger)' : 'var(--warning)',
                padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid currentColor'
              }}>
                ⚠ {item.name} ({item.quantity} left)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '0.75rem', borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="form-input"
          style={{ margin: 0, width: '100%', border: 'none', background: 'transparent' }}
          placeholder="Filter drugs or materials ledger list..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid List */}
      <div className="dashboard-section">
        <Table headers={['Material Name & Group', 'Current Balance', 'Restock Trigger Level', 'Expiry Date', 'Status', 'Actions']}>
          {filteredItems.map(item => (
            <tr key={item.id}>
              <td>
                <div style={{ fontWeight: 700, fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                  <Package size={16} style={{ color: 'var(--accent-teal)' }} />
                  {item.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{item.category}</div>
              </td>
              <td style={{ fontWeight: 800, fontSize: '1.05rem', color: item.quantity === 0 ? 'var(--danger)' : item.quantity <= item.reorderLevel ? 'var(--warning)' : 'var(--text-primary)' }}>
                {item.quantity} Units
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>{item.reorderLevel} Units</td>
              <td>{new Date(item.expiryDate).toLocaleDateString()}</td>
              <td>
                <span className={`badge badge-${item.status === 'In Stock' ? 'completed' : item.status === 'Low Stock' ? 'approved' : 'pending'}`}>
                  {item.status}
                </span>
              </td>
              <td>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem' }}
                  onClick={() => handleReorder(item.id)}
                >
                  <ArrowUpRight size={14} />
                  <span>Reorder</span>
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {/* Add Stock Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Inventory Item">
        <form onSubmit={handleAddStock}>
          <div className="form-group">
            <label className="form-label">Material Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Metformin 500mg"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category Group</label>
              <select
                className="form-select"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              >
                <option value="Oral Tablet">Oral Tablet</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="IV Fluids">IV Fluids</option>
                <option value="Consumables">Consumables</option>
                <option value="Hormones">Hormones</option>
                <option value="Analgesic">Analgesic</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Initial Quantity *</label>
              <input
                type="number"
                className="form-input"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Reorder Safety Level *</label>
              <input
                type="number"
                className="form-input"
                value={newItem.reorderLevel}
                onChange={(e) => setNewItem({ ...newItem, reorderLevel: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date *</label>
              <input
                type="date"
                className="form-input"
                value={newItem.expiryDate}
                onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1.5rem' }}>
            Register New Stock
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
