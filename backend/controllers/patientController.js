import User from '../models/User.js';
import Patient from '../models/Patient.js';

// @desc    Get all patients (Admin/Doctor only)
// @route   GET /api/patients
// @access  Private/Admin/Doctor
export const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find().populate('user', 'name email phoneNumber gender avatar');
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient by ID
// @route   GET /api/patients/:id
// @access  Private/Admin/Doctor
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('user', 'name email phoneNumber gender avatar');
    if (patient) {
      res.json(patient);
    } else {
      res.status(404).json({ message: 'Patient not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update patient profile
// @route   PUT /api/patients/:id
// @access  Private
export const updatePatient = async (req, res) => {
  const { name, phoneNumber, gender, dateOfBirth, bloodType, allergies, medicalHistory, emergencyContact } = req.body;

  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check authorization: User can only update their own patient record (unless Admin/Doctor)
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'doctor' &&
      patient.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    // Update User details
    const user = await User.findById(patient.user);
    if (user) {
      user.name = name || user.name;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      user.gender = gender || user.gender;
      await user.save();
    }

    // Update Patient details
    patient.dateOfBirth = dateOfBirth || patient.dateOfBirth;
    patient.bloodType = bloodType || patient.bloodType;
    patient.emergencyContact = emergencyContact || patient.emergencyContact;

    // Admin/Doctor or Patient themselves can modify allergies & history
    if (allergies !== undefined) patient.allergies = allergies;
    if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;

    const updatedPatient = await patient.save();
    const populated = await Patient.findById(updatedPatient._id).populate('user', 'name email phoneNumber gender avatar');

    res.json({
      message: 'Patient profile updated',
      patient: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get complete patient history by Unique Patient ID (PID-XXXX)
// @route   GET /api/patients/history/:patientId
// @access  Private/Admin/Doctor
export const getPatientHistoryByUniqueId = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Search by unique patientId (case-insensitive or exact)
    const patient = await Patient.findOne({
      $or: [
        { patientId: patientId.trim() },
        { patientId: patientId.trim().toUpperCase() }
      ]
    }).populate('user', 'name email phoneNumber gender avatar');

    if (!patient) {
      return res.status(404).json({ message: `Patient with ID ${patientId} not found` });
    }

    // Dynamic imports for related models to avoid circular dependencies
    const Appointment = (await import('../models/Appointment.js')).default;
    const Prescription = (await import('../models/Prescription.js')).default;
    const Report = (await import('../models/Report.js')).default;

    const [appointments, prescriptions, reports] = await Promise.all([
      Appointment.find({ patient: patient._id })
        .populate('doctor', 'specialization')
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
        .populate('department', 'name')
        .sort({ date: -1 }),
      Prescription.find({ patient: patient._id })
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 }),
      Report.find({ patient: patient._id })
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 }),
    ]);

    res.json({
      patient,
      appointments,
      prescriptions,
      reports,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

