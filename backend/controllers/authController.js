import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new patient
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password, phoneNumber, gender, dateOfBirth, bloodType, emergencyContact } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user with patient role
    const user = await User.create({
      name,
      email,
      password,
      role: 'patient',
      phoneNumber,
      gender,
    });

    if (user) {
      // Generate Unique Patient ID (e.g., PID-849201)
      const count = await Patient.countDocuments();
      const patientId = `PID-${1000 + count + 1}`;

      // Create corresponding Patient record
      const patient = await Patient.create({
        user: user._id,
        patientId,
        dateOfBirth: dateOfBirth || new Date(),
        bloodType: bloodType || 'O+',
        emergencyContact: emergencyContact || 'N/A',
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patientId: patient._id,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      let relativeId = null;

      // Find role-specific profile ID
      if (user.role === 'patient') {
        const patient = await Patient.findOne({ user: user._id });
        if (patient) relativeId = patient._id;
      } else if (user.role === 'doctor') {
        const doctor = await Doctor.findOne({ user: user._id });
        if (doctor) relativeId = doctor._id;
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        relativeId: relativeId,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      let relativeId = null;
      let detailedProfile = null;

      if (user.role === 'patient') {
        detailedProfile = await Patient.findOne({ user: user._id });
        if (detailedProfile) relativeId = detailedProfile._id;
      } else if (user.role === 'doctor') {
        detailedProfile = await Doctor.findOne({ user: user._id }).populate('department');
        if (detailedProfile) relativeId = detailedProfile._id;
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        avatar: user.avatar,
        relativeId,
        detailedProfile,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload user avatar profile picture
// @route   POST /api/auth/avatar
// @access  Private
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user avatar
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully',
      avatar: user.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update current logged-in user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      name,
      phoneNumber,
      gender,
      department,
      specialization,
      consultationFee,
      experience,
      qualification,
      dateOfBirth,
      bloodType,
      allergies,
      medicalHistory,
      emergencyContact,
    } = req.body;

    if (name) user.name = name;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (gender) user.gender = gender;
    if (department && (user.role === 'admin' || user.role === 'superadmin' || user.role.startsWith('admin_') || user.role === 'receptionist')) {
      user.department = department;
    }

    await user.save();

    // If patient, also update Patient profile
    if (user.role === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (patient) {
        if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
        if (bloodType) patient.bloodType = bloodType;
        if (allergies !== undefined) {
          patient.allergies = Array.isArray(allergies)
            ? allergies
            : allergies.split(',').map((x) => x.trim()).filter(Boolean);
        }
        if (medicalHistory !== undefined) {
          patient.medicalHistory = Array.isArray(medicalHistory)
            ? medicalHistory
            : medicalHistory.split(',').map((x) => x.trim()).filter(Boolean);
        }
        if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
        await patient.save();
      }
    }

    // If doctor, also update Doctor profile
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: user._id });
      if (doctor) {
        if (specialization) doctor.specialization = specialization;
        if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
        if (experience !== undefined) doctor.experience = experience;
        if (qualification) doctor.qualification = qualification;
        await doctor.save();
      }
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify account for password recovery
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No registered account found with this email' });
    }
    res.json({
      success: true,
      email: user.email,
      name: user.name,
      message: `Account verified for ${user.name}. You may now set a new password.`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password with new password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in with your new password.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
