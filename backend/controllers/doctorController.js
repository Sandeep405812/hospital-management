import User from '../models/User.js';
import Doctor from '../models/Doctor.js';

// @desc    Create a new doctor (Admin only)
// @route   POST /api/doctors
// @access  Private/Admin
export const createDoctor = async (req, res) => {
  const { name, email, password, phoneNumber, gender, specialization, department, consultationFee, experience, qualification, schedule } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create doctor user profile
    const user = await User.create({
      name,
      email,
      password,
      role: 'doctor',
      phoneNumber,
      gender,
    });

    if (user) {
      // Create corresponding Doctor details record
      const doctor = await Doctor.create({
        user: user._id,
        specialization,
        department: department || null,
        consultationFee: consultationFee || 500,
        experience,
        qualification,
        schedule: schedule || ['09:00 - 13:00', '14:00 - 17:00'],
      });

      res.status(201).json({
        message: 'Doctor created successfully',
        doctor,
      });
    } else {
      res.status(400).json({ message: 'Invalid doctor user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
export const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find()
      .populate('user', 'name email phoneNumber gender avatar')
      .populate('department', 'name');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('user', 'name email phoneNumber gender avatar')
      .populate('department', 'name');

    if (doctor) {
      res.json(doctor);
    } else {
      res.status(404).json({ message: 'Doctor not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update doctor profile
// @route   PUT /api/doctors/:id
// @access  Private
export const updateDoctor = async (req, res) => {
  const { name, phoneNumber, gender, specialization, department, consultationFee, experience, qualification, schedule } = req.body;

  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check authorization: User can only update their own doctor record (unless Admin)
    if (req.user.role !== 'admin' && doctor.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    // Update User details
    const user = await User.findById(doctor.user);
    if (user) {
      user.name = name || user.name;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      user.gender = gender || user.gender;
      await user.save();
    }

    // Update Doctor details
    doctor.specialization = specialization || doctor.specialization;
    if (department !== undefined) doctor.department = department || null;
    doctor.consultationFee = consultationFee || doctor.consultationFee;
    doctor.experience = experience !== undefined ? experience : doctor.experience;
    doctor.qualification = qualification || doctor.qualification;
    doctor.schedule = schedule || doctor.schedule;

    const updatedDoctor = await doctor.save();
    const populated = await Doctor.findById(updatedDoctor._id)
      .populate('user', 'name email phoneNumber gender avatar')
      .populate('department', 'name');

    res.json({
      message: 'Doctor profile updated',
      doctor: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete doctor (Admin only)
// @route   DELETE /api/doctors/:id
// @access  Private/Admin
export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Delete associated User
    await User.findByIdAndDelete(doctor.user);
    // Delete Doctor record
    await Doctor.findByIdAndDelete(req.params.id);

    res.json({ message: 'Doctor and associated user account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
