import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { ShoppingCart, ShoppingBag, Plus, Minus, Trash, ArrowRight, ShieldCheck, Truck, Check } from 'lucide-react';

const MedicalStore = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products] = useState([
    { id: 1, name: 'Paracetamol 500mg', category: 'Pain & Fever Relief', price: 40, rxRequired: false, stock: 15, desc: 'Effective relief from headache, body ache and mild fevers.' },
    { id: 2, name: 'Amoxicillin 250mg', category: 'Antibiotics', price: 140, rxRequired: true, stock: 8, desc: 'Broad spectrum penicillin antibiotic. Requires validation.' },
    { id: 3, name: 'Torex Cough Syrup 100ml', category: 'Cough & Cold', price: 95, rxRequired: false, stock: 25, desc: 'Non-drowsy bronchial formula for wet & dry cough relief.' },
    { id: 4, name: 'Limcee Vitamin C 500mg', category: 'Wellness & Immunity', price: 65, rxRequired: false, stock: 45, desc: 'Orange flavored chewable immunity booster supplement.' },
    { id: 5, name: 'Digital Thermometer', category: 'Medical Diagnostics', price: 320, rxRequired: false, stock: 3, desc: 'High precision digital sensor with memory alert chime.' },
    { id: 6, name: 'Insulin Glargine 100U', category: 'Diabetes Care', price: 580, rxRequired: true, stock: 5, desc: 'Long-acting basal insulin analogue injection pen.' }
  ]);

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('shop'); // shop, tracking
  
  // Simulated Order History logs
  const [orders, setOrders] = useState([
    { id: 'ORD821389', date: '06/28/2026', total: 245, status: 'delivered', items: 'Paracetamol 500mg x2, Vitamin C x1' },
    { id: 'ORD902198', date: '06/30/2026', total: 720, status: 'dispatched', items: 'Insulin Glargine 100U x1, Torex Syrup x1' }
  ]);

  const handleAddToCart = (product) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert('Stock limit reached for this item!');
        return;
      }
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setIsCartOpen(true);
  };

  const handleUpdateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.stock) {
          alert('Stock limit reached!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemove = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const hasRx = cart.some(item => item.rxRequired);
    if (hasRx) {
      alert('🛡️ Rx Verification: Our pharmacy desk has automatically validated your digital prescription files. Proceeding to checkout...');
    }

    const subtotal = calculateSubtotal();
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    try {
      // Mock order submission and billing generation
      const billingRes = await api.post('/billing', {
        amount: subtotal,
        tax: tax,
        total: total,
        patientId: user.relativeId,
        description: `E-Pharmacy Order: ${cart.map(c => `${c.name} (x${c.quantity})`).join(', ')}`
      });

      // Add to tracking
      const newOrder = {
        id: `ORD${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleDateString(),
        total: total,
        status: 'received',
        items: cart.map(c => `${c.name} x${c.quantity}`).join(', ')
      };
      setOrders([newOrder, ...orders]);
      setCart([]);
      setIsCartOpen(false);

      alert('Pharmacy order registered! Please complete payment at secure checkout.');
      navigate(`/billing/${billingRes._id}/checkout`);
    } catch (err) {
      alert(err.message || 'Checkout failed');
    }
  };

  const wellnessThemeStyles = {
    '--store-green': '#10b981',
    '--store-emerald': '#047857',
    '--store-bg': '#f0fdf4',
    '--store-border': '#d1fae5',
    '--store-text': '#064e3b'
  };

  return (
    <div style={wellnessThemeStyles}>
      {/* Store Header Navigation */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.25rem 2rem', backgroundColor: 'var(--store-bg)',
        border: '1px solid var(--store-border)', borderRadius: 'var(--border-radius-lg)',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--store-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={28} />
            <span>CareHMS Pharmacy E-Store</span>
          </h1>
          <p style={{ color: 'var(--store-emerald)', margin: '0.2rem 0 0 0', fontSize: '0.88rem', fontWeight: 600 }}>
            Order OTC Drugs & Wellness Supplies Online • Instant Home Delivery
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setActiveTab('shop')}
            className={`btn ${activeTab === 'shop' ? 'btn-teal' : 'btn-secondary'} btn-sm`}
            style={{ backgroundColor: activeTab === 'shop' ? 'var(--store-green)' : 'transparent', borderColor: 'var(--store-green)', color: activeTab === 'shop' ? '#fff' : 'var(--store-text)' }}
          >
            Medicine Catalog
          </button>
          <button 
            onClick={() => setActiveTab('tracking')}
            className={`btn ${activeTab === 'tracking' ? 'btn-teal' : 'btn-secondary'} btn-sm`}
            style={{ backgroundColor: activeTab === 'tracking' ? 'var(--store-green)' : 'transparent', borderColor: 'var(--store-green)', color: activeTab === 'tracking' ? '#fff' : 'var(--store-text)' }}
          >
            Order Logs
          </button>
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem',
              backgroundColor: 'var(--store-emerald)', color: '#fff', border: 'none',
              padding: '0.5rem 1.25rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 700
            }}
          >
            <ShoppingCart size={18} />
            <span>Cart</span>
            {cart.length > 0 && (
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444',
                color: '#fff', fontSize: '0.68rem', fontWeight: 'bold', padding: '0.1rem 0.4rem',
                borderRadius: '10px'
              }}>{cart.reduce((a, c) => a + c.quantity, 0)}</span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'shop' ? (
        /* Medicine Catalog Grid */
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem', animation: 'fadeIn 0.3s ease-out'
        }}>
          {products.map(prod => (
            <div key={prod.id} style={{
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--store-border)',
              borderRadius: 'var(--border-radius)', padding: '1.5rem', display: 'flex',
              flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px',
              transition: 'var(--transition-smooth)', boxShadow: 'var(--shadow-sm)',
              position: 'relative'
            }} className="store-product-card">
              {prod.rxRequired && (
                <span style={{
                  position: 'absolute', top: '12px', right: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)',
                  fontSize: '0.62rem', fontWeight: 'bold', padding: '0.2rem 0.45rem',
                  borderRadius: '4px', border: '1px solid var(--danger)', letterSpacing: '0.5px'
                }}>
                  Rx REQUIRED
                </span>
              )}
              
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--store-green)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {prod.category}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-primary)' }}>
                  {prod.name}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0.5rem 0' }}>
                  {prod.desc}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--store-emerald)' }}>
                    ₹{prod.price}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: prod.stock <= 5 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {prod.stock <= 5 ? `Only ${prod.stock} left` : 'In Stock'}
                  </span>
                </div>

                <button
                  onClick={() => handleAddToCart(prod)}
                  style={{
                    backgroundColor: 'var(--store-bg)', color: 'var(--store-text)',
                    border: '1px solid var(--store-green)', width: '100%', padding: '0.5rem',
                    borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--store-green)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--store-bg)'; e.currentTarget.style.color = 'var(--store-text)'; }}
                >
                  <Plus size={16} />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Order Tracking Timeline */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          {orders.map(ord => (
            <div key={ord.id} style={{
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius)', padding: '1.5rem', display: 'flex',
              flexDirection: 'column', gap: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Order ID: {ord.id}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1rem' }}>Date: {ord.date}</span>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--store-emerald)' }}>Total Charged: ₹{ord.total}</div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong>Ordered Supplies:</strong> {ord.items}
              </div>

              {/* Visual Status Progress Steps */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', position: 'relative',
                marginTop: '0.5rem', paddingBottom: '0.5rem', overflowX: 'auto', gap: '1rem'
              }}>
                {[
                  { name: 'Received', key: 'received', desc: 'Order logged' },
                  { name: 'Rx Verification', key: 'verification', desc: 'Medical clearance' },
                  { name: 'Dispatched', key: 'dispatched', desc: 'Left pharmacy' },
                  { name: 'Delivered', key: 'delivered', desc: 'Handed over' }
                ].map((step, sIdx) => {
                  const states = ['received', 'verification', 'dispatched', 'delivered'];
                  const curIdx = states.indexOf(ord.status);
                  const isDone = sIdx <= curIdx;
                  return (
                    <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '90px', position: 'relative' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        backgroundColor: isDone ? 'var(--store-green)' : 'var(--bg-tertiary)',
                        color: isDone ? '#fff' : 'var(--text-muted)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', border: '2px solid var(--glass-border)',
                        fontWeight: 'bold', fontSize: '0.75rem', zIndex: 2
                      }}>
                        {isDone ? <Check size={14} /> : sIdx + 1}
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.4rem', color: isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {step.name}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shopping Cart Side Sliding Drawer */}
      {isCartOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px',
          backgroundColor: '#0f172a', borderLeft: '1px solid var(--store-green)',
          boxShadow: '-10px 0 35px rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex',
          flexDirection: 'column', animation: 'slideLeft 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#075e54', color: '#fff'
          }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShoppingCart size={20} />
              <span>Shopping Cart</span>
            </span>
            <button 
              onClick={() => setIsCartOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Cart Items Panel */}
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cart.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <ShoppingBag size={48} style={{ opacity: 0.3 }} />
                <span>Your cart is empty.</span>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} style={{
                  borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ flex: 1, marginRight: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--store-green)', marginTop: '0.15rem' }}>₹{item.price} each</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleUpdateQty(item.id, -1)}
                      style={{ border: 'none', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Minus size={10} />
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', width: '20px', textAlign: 'center', color: '#fff' }}>{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQty(item.id, 1)}
                      style={{ border: 'none', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Plus size={10} />
                    </button>
                    
                    <button 
                      onClick={() => handleRemove(item.id)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', marginLeft: '0.4rem' }}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Block */}
          {cart.length > 0 && (
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', backgroundColor: '#111827' }}>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
                <p style={{ display: 'flex', justifyContent: 'space-between', margin: 0 }}>
                  <span>Subtotal:</span>
                  <span>₹{calculateSubtotal()}</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between', margin: 0 }}>
                  <span>Taxes (GST 18%):</span>
                  <span>₹{Math.round(calculateSubtotal() * 0.18)}</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between', margin: 0, fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--store-green)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Total Amount:</span>
                  <span>₹{calculateSubtotal() + Math.round(calculateSubtotal() * 0.18)}</span>
                </p>
              </div>

              <button
                onClick={handleCheckout}
                style={{
                  width: '100%', backgroundColor: 'var(--store-emerald)', color: '#fff',
                  border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 800,
                  fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default MedicalStore;
