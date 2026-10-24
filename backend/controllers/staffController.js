import User from '../models/User.js';

// @desc    Get all staff and administrators
// @route   GET /api/staff
// @access  Private (Super Admin / Admin / Staff Admin)
export const getAllStaff = async (req, res) => {
  try {
    const staffRoles = [
      'superadmin',
      'admin',
      'admin_doctors',
      'admin_staff',
      'admin_helpdesk',
      'admin_beds',
      'doctor',
      'receptionist',
    ];

    const staffMembers = await User.find({ role: { $in: staffRoles } })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(staffMembers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new staff member or specialized sub-admin
// @route   POST /api/staff
// @access  Private (Super Admin / Admin)
export const createStaffMember = async (req, res) => {
  try {
    const { name, email, password, role, department, adminType, phoneNumber, gender } = req.body;

    // Check if user already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Only Superadmin can create other admins or superadmins
    if ((role === 'superadmin' || role === 'admin' || role.startsWith('admin_')) && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only Super Admin can assign administrative roles' });
    }

    const newStaff = await User.create({
      name,
      email,
      password: password || 'hospitalstaff123',
      role: role || 'receptionist',
      department: department || 'General',
      adminType: adminType || (role.startsWith('admin_') ? role.replace('admin_', '') + '_manager' : 'none'),
      phoneNumber: phoneNumber || '',
      gender: gender || 'Other',
      assignedBy: req.user._id,
      status: 'Active',
    });

    res.status(201).json({
      message: 'Staff member created successfully',
      staff: {
        _id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        department: newStaff.department,
        adminType: newStaff.adminType,
        status: newStaff.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update staff status, role, or department
// @route   PUT /api/staff/:id
// @access  Private (Super Admin / Admin)
export const updateStaffMember = async (req, res) => {
  try {
    const { name, role, department, status, phoneNumber, schedule } = req.body;
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Prevent modifying Super Admin if not Super Admin themselves
    if (staff.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Cannot modify Super Admin accounts' });
    }

    if (name) staff.name = name;
    if (role) {
      staff.role = role;
      if (role.startsWith('admin_')) {
        staff.adminType = role.replace('admin_', '') + '_manager';
      }
    }
    if (department) staff.department = department;
    if (status) staff.status = status;
    if (phoneNumber) staff.phoneNumber = phoneNumber;
    if (schedule !== undefined) staff.schedule = schedule;

    await staff.save();

    res.json({ message: 'Staff member updated successfully', staff });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
// @access  Private (Super Admin)
export const deleteStaffMember = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (staff.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete Super Admin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
