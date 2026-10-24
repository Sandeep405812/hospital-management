import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';

// @desc    Create a new appointment
// @route   POST /api/appointments
// @access  Private
export const createAppointment = async (req, res) => {
  const { doctorId, departmentId, date, timeSlot, symptoms, paymentMethod, paymentStatus, transactionId } = req.body;

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

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Calculate Sequential Token Serial Number (FIFO queue model like eSanjeevani / Hospital OPD)
    // Multiple patients can book into the doctor's OPD session without being blocked
    const existingCount = await Appointment.countDocuments({
      doctor: doctor._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    });
    const serialNumber = existingCount + 1;

    // Upfront Payment at appointment booking time (no post-appointment payment)
    const finalPaymentStatus = 'Paid';
    const finalPaymentMethod = paymentMethod || 'UPI';
    const finalTransactionId = transactionId || `TXN${Date.now().toString().slice(-8)}`;

    // Create appointment directly in confirmed waiting queue with Paid status
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: departmentId || doctor.department,
      date,
      timeSlot,
      symptoms,
      fee: doctor.consultationFee,
      serialNumber,
      status: 'approved',
      paymentStatus: finalPaymentStatus,
      paymentMethod: finalPaymentMethod,
      transactionId: finalTransactionId,
    });

    if (appointment) {
      // Automatically generate a paid billing record (paid upfront at appointment booking time)
      const taxRate = 0.18; // 18% GST/Tax
      const tax = parseFloat((appointment.fee * taxRate).toFixed(2));
      const total = appointment.fee + tax;

      await Billing.create({
        patient: patient._id,
        appointment: appointment._id,
        amount: appointment.fee,
        tax,
        total,
        status: 'paid', // Always marked paid upfront at appointment time
        paymentMethod: finalPaymentMethod,
      });

      res.status(201).json({
        message: `Appointment booked & Paid (₹${total})! Token #${serialNumber} generated in Doctor's OPD Queue.`,
        appointment,
      });
    } else {
      res.status(400).json({ message: 'Invalid appointment details' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all appointments (Filtered by role and date range)
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res) => {
  try {
    let query = {};
    const { startDate, endDate, patientId } = req.query;

    // Filter appointments based on user role
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (patient) query.patient = patient._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (doctor) query.doctor = doctor._id;
    }

    // Date range filter support
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    // Filter by patient ID if passed (for doctor/admin)
    if (patientId) {
      const patientDoc = await Patient.findOne({ patientId: patientId.trim() });
      if (patientDoc) {
        query.patient = patientDoc._id;
      } else {
        return res.json([]);
      }
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: 'patient',
        select: 'patientId dateOfBirth bloodType allergies medicalHistory emergencyContact',
        populate: { path: 'user', select: 'name email phoneNumber gender avatar' },
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email avatar' },
      })
      .populate('department', 'name')
      .sort({ date: 1, serialNumber: 1, createdAt: 1 });

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

// @desc    Get booked slots for a doctor on a specific date
// @route   GET /api/appointments/booked-slots
// @access  Private
export const getBookedSlots = async (req, res) => {
  const { doctorId, date } = req.query;

  try {
    if (!doctorId || !date) {
      return res.status(400).json({ message: 'Doctor ID and Date are required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctor: doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'approved', 'ongoing'] },
    }).select('timeSlot');

    const bookedSlots = appointments.map((app) => app.timeSlot);
    res.json(bookedSlots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Call next patient in doctor's queue (auto-advances queue)
// @route   POST /api/appointments/call-next
// @access  Private (Doctor / Admin)
export const callNextPatient = async (req, res) => {
  let { doctorId, date } = req.body;

  try {
    if (!doctorId && req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ user: req.user._id });
      if (doc) doctorId = doc._id;
    }

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }

    // Timezone-safe date window (matches both UTC and Local timezone appointments for the target day)
    const baseDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(baseDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const localStart = new Date(baseDate);
    localStart.setHours(0, 0, 0, 0);
    const dayStart = new Date(Math.min(startOfDay.getTime(), localStart.getTime()) - 6 * 3600 * 1000);

    const endOfDay = new Date(baseDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const localEnd = new Date(baseDate);
    localEnd.setHours(23, 59, 59, 999);
    const dayEnd = new Date(Math.max(endOfDay.getTime(), localEnd.getTime()) + 6 * 3600 * 1000);

    // 1. If any appointment is currently 'ongoing', mark it as 'completed'
    const ongoingApp = await Appointment.findOne({
      doctor: doctorId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: 'ongoing',
    });

    if (ongoingApp) {
      ongoingApp.status = 'completed';
      await ongoingApp.save();
    }

    // 2. Find the next waiting patient in FIFO order
    const nextApp = await Appointment.findOne({
      doctor: doctorId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['approved', 'waiting', 'pending'] },
    })
      .sort({ serialNumber: 1, createdAt: 1 })
      .populate('patient')
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phoneNumber gender' },
      });

    if (!nextApp) {
      return res.json({
        message: 'No more waiting patients in queue for this doctor today.',
        currentOngoing: null,
        previousCompleted: ongoingApp || null,
      });
    }

    // 3. Mark next patient as ongoing
    nextApp.status = 'ongoing';
    await nextApp.save();

    res.json({
      message: `Token #${nextApp.serialNumber} (${nextApp.patient?.user?.name || 'Patient'}) called for consultation!`,
      currentOngoing: nextApp,
      previousCompleted: ongoingApp || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
