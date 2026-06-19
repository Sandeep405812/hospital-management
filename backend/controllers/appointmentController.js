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

    // Scheduling collision detection: Enforce slot scheduling algorithm
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const collision = await Appointment.findOne({
      doctor: doctor._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      timeSlot,
      status: { $in: ['pending', 'approved'] },
    });

    if (collision) {
      return res.status(400).json({
        message: 'This doctor is already booked for this time slot. Please select another slot or date.',
      });
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
        populate: { path: 'user', select: 'name email phoneNumber gender avatar' },
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email avatar' },
      })
      .populate('department', 'name')
      .sort({ date: 1, timeSlot: 1 });

    // Calculate queue position and estimated wait times dynamically
    const appointmentsWithQueue = await Promise.all(
      appointments.map(async (app) => {
        const startOfDay = new Date(app.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(app.date);
        endOfDay.setHours(23, 59, 59, 999);

        // Find all pending/approved appointments for this doctor on this day
        const dailyAppointments = app.doctor
          ? await Appointment.find({
              doctor: app.doctor._id,
              date: { $gte: startOfDay, $lte: endOfDay },
              status: { $in: ['pending', 'approved'] },
            }).sort({ timeSlot: 1, createdAt: 1 })
          : [];

        // Find index of current appointment
        const index = app.doctor
          ? dailyAppointments.findIndex((d) => d._id.toString() === app._id.toString())
          : -1;
        
        const appObj = app.toObject();
        
        if (index !== -1 && (app.status === 'pending' || app.status === 'approved')) {
          appObj.queuePosition = index + 1;
          appObj.estimatedWaitTime = index * 15; // 15 mins per patient
        } else {
          appObj.queuePosition = null;
          appObj.estimatedWaitTime = null;
        }

        return appObj;
      })
    );

    res.json(appointmentsWithQueue);
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

// @desc    Get appointment analytics
// @route   GET /api/appointments/analytics
// @access  Private/Doctor/Admin
export const getAppointmentAnalytics = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (doctor) query.doctor = doctor._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Doctor or Admin only' });
    }

    const appointments = await Appointment.find(query)
      .populate('department', 'name');

    const statusCounts = { pending: 0, approved: 0, completed: 0, cancelled: 0 };
    const departmentCounts = {};
    const dailyCounts = {};

    appointments.forEach((app) => {
      const status = app.status || 'pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const deptName = app.department?.name || 'General';
      departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;

      if (app.date) {
        const dateStr = new Date(app.date).toISOString().split('T')[0];
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
      }
    });

    const sortedDailyCounts = {};
    Object.keys(dailyCounts).sort().forEach((key) => {
      sortedDailyCounts[key] = dailyCounts[key];
    });

    res.json({
      statusCounts,
      departmentCounts,
      dailyCounts: sortedDailyCounts,
      totalCount: appointments.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
