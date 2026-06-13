import Prescription from '../models/Prescription.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

// @desc    Create a new prescription (Doctor only)
// @route   POST /api/prescriptions
// @access  Private/Doctor
export const createPrescription = async (req, res) => {
  const { appointmentId, medicines, notes } = req.body;

  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return res.status(403).json({ message: 'Only registered doctors can issue prescriptions' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctor.toString() !== doctor._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to prescribe for this appointment' });
    }

    // Create prescription
    const prescription = await Prescription.create({
      appointment: appointmentId,
      patient: appointment.patient,
      doctor: doctor._id,
      medicines,
      notes,
    });

    if (prescription) {
      // Automatically mark appointment as completed
      appointment.status = 'completed';
      await appointment.save();

      res.status(201).json({
        message: 'Prescription issued successfully and appointment completed',
        prescription,
      });
    } else {
      res.status(400).json({ message: 'Invalid prescription details' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all prescriptions (Filtered by role)
// @route   GET /api/prescriptions
// @access  Private
export const getPrescriptions = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (patient) query.patient = patient._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (doctor) query.doctor = doctor._id;
    }

    const prescriptions = await Prescription.find(query)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email gender dateOfBirth' },
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name specialization email' },
      })
      .populate('appointment', 'date symptoms')
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get prescription by ID
// @route   GET /api/prescriptions/:id
// @access  Private
export const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email gender' },
        select: 'dateOfBirth bloodType allergies',
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name' },
        select: 'specialization consultationFee qualification',
      })
      .populate('appointment', 'date symptoms');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Auth constraints: Patient/Doctor of this prescription, or Admin
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || prescription.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this prescription' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor || prescription.doctor._id.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this prescription' });
      }
    }

    res.json(prescription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
