import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Plus, Trash2, Edit } from 'lucide-react';

const Departments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Department creation Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
    headOfDepartment: '',
  });

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await fetchDepartments();
        if (user.role === 'admin') {
          const docs = await api.get('/doctors');
          setDoctors(docs);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleAddDept = async (e) => {
    e.preventDefault();
    try {
      await api.post('/departments', deptForm);
      setIsAddModalOpen(false);
      setDeptForm({ name: '', description: '', headOfDepartment: '' });
      fetchDepartments();
      alert('Department created successfully!');
    } catch (error) {
      alert(error.message || 'Creation failed');
    }
  };

  const handleDeleteDept = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await api.delete(`/departments/${id}`);
        fetchDepartments();
        alert('Department deleted successfully');
      } catch (error) {
        alert(error.message || 'Delete failed');
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading departments...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Hospital clinical departments and units</p>
        </div>
        {user.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} />
            <span>Add Department</span>
          </button>
        )}
      </div>

      <div className="dashboard-section">
        {departments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No departments defined yet.</p>
        ) : (
          <Table headers={['Department Name', 'Description', 'Head of Department', 'Actions']}>
            {departments.map((dept) => (
              <tr key={dept._id}>
                <td style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--accent-teal)' }}>{dept.name}</td>
                <td style={{ maxWidth: '400px' }}>{dept.description}</td>
                <td>{dept.headOfDepartment?.user?.name || 'Not Assigned'}</td>
                <td>
                  {user.role === 'admin' && (
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.35rem' }}
                      onClick={() => handleDeleteDept(dept._id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Add Department Modal (Admin-only) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Hospital Department">
        <form onSubmit={handleAddDept}>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Cardiology"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-textarea"
              placeholder="Describe the department's operations and treatments..."
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Head of Department (Optional)</label>
            <select
              className="form-select"
              value={deptForm.headOfDepartment}
              onChange={(e) => setDeptForm({ ...deptForm, headOfDepartment: e.target.value })}
            >
              <option value="">-- Choose Head of Department --</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.user?.name} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            Create Department
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Departments;
