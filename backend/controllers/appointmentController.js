import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';

// @desc    Create a new appointment
// @route   POST /api/appointments
// @access  Private
export const createAppointment = async (req, res) => {
  const { doctorId, departmentId, date, timeSlot, symptoms } = req.body;

  try {
    // Check if the current user is a patient
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(400).json({ message: 'Only registered patients can book appointments' });
    }

    // Verify doctor details and consultation fee
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Create the appointment
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: departmentId || doctor.department,
      date,
      timeSlot,
      symptoms,
      fee: doctor.consultationFee,
    });

    if (appointment) {
      // Automatically generate a billing record
      const taxRate = 0.18; // 18% GST/Tax
      const tax = parseFloat((appointment.fee * taxRate).toFixed(2));
      const total = appointment.fee + tax;

      await Billing.create({
        patient: patient._id,
        appointment: appointment._id,
        amount: appointment.fee,
        tax,
        total,
        status: 'unpaid',
      });

      res.status(201).json({
        message: 'Appointment booked successfully and invoice generated',
        appointment,
      });
    } else {
      res.status(400).json({ message: 'Invalid appointment details' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all appointments (Filtered by role)
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res) => {
  try {
    let query = {};

    // Filter appointments based on user role
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (patient) query.patient = patient._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (doctor) query.doctor = doctor._id;
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phoneNumber gender' },
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('department', 'name')
      .sort({ date: 1, timeSlot: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private
export const updateAppointmentStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Auth constraints:
    // Patient can cancel. Doctor and Admin can change to any valid status.
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || appointment.patient.toString() !== patient._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to modify this appointment' });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({ message: 'Patients can only cancel appointments' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to modify this appointment' });
      }
    }

    appointment.status = status;
    const updated = await appointment.save();

    res.json({
      message: `Appointment status updated to ${status}`,
      appointment: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
