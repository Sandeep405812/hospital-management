import Surgery from '../models/Surgery.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

// Helper to convert HH:MM string to absolute minutes
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if two time slots overlap
const isOverlapping = (start1, end1, start2, end2) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
};

// @desc    Get all surgeries scheduled
// @route   GET /api/surgeries
// @access  Private
export const getSurgeries = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (patient) query.patient = patient._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (doctor) query.doctor = doctor._id;
    }

    const surgeries = await Surgery.find(query)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phoneNumber gender' },
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name specialization' },
      })
      .sort({ date: 1, startTime: 1 });

    res.json(surgeries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Schedule a new surgery (with conflict checks)
// @route   POST /api/surgeries
// @access  Private/Admin/Doctor
export const createSurgery = async (req, res) => {
  const { patientId, doctorId, otName, date, startTime, endTime } = req.body;

  try {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);

    if (startMins >= endMins) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all scheduled/ongoing surgeries in the same OT on that date
    const otSurgeries = await Surgery.find({
      otName,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled', 'ongoing'] },
    });

    // Check for OT scheduling conflict
    for (const surg of otSurgeries) {
      if (isOverlapping(startTime, endTime, surg.startTime, surg.endTime)) {
        return res.status(400).json({
          message: `OT Collision: ${otName} is already booked from ${surg.startTime} to ${surg.endTime} on this day.`,
        });
      }
    }

    // Fetch all surgeries for the same doctor on that date
    const doctorSurgeries = await Surgery.find({
      doctor: doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled', 'ongoing'] },
    });

    // Check for Doctor scheduling conflict (doctor cannot perform two surgeries at once)
    for (const surg of doctorSurgeries) {
      if (isOverlapping(startTime, endTime, surg.startTime, surg.endTime)) {
        return res.status(400).json({
          message: `Doctor Collision: This surgeon is already booked for another operation from ${surg.startTime} to ${surg.endTime} on this day.`,
        });
      }
    }

    const surgery = await Surgery.create({
      patient: patientId,
      doctor: doctorId,
      otName,
      date: targetDate,
      startTime,
      endTime,
    });

    const populated = await Surgery.findById(surgery._id)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email' },
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name' },
      });

    res.status(201).json({ message: 'Surgery scheduled successfully', surgery: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update surgery status
// @route   PUT /api/surgeries/:id/status
// @access  Private/Admin/Doctor
export const updateSurgeryStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const surgery = await Surgery.findById(req.params.id);
    if (!surgery) {
      return res.status(404).json({ message: 'Surgery booking not found' });
    }

    surgery.status = status;
    await surgery.save();

    res.json({ message: `Surgery status updated to ${status}`, surgery });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
