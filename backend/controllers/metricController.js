import HealthMetric from '../models/HealthMetric.js';
import Patient from '../models/Patient.js';

// @desc    Add a health metric
// @route   POST /api/metrics
// @access  Private/Patient
export const addMetric = async (req, res) => {
  const { type, value, unit, date } = req.body;

  try {
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(403).json({ message: 'Only registered patients can log health metrics' });
    }

    const metric = await HealthMetric.create({
      patient: patient._id,
      type,
      value,
      unit,
      date: date || new Date(),
    });

    res.status(201).json(metric);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all health metrics of patient (or patient query for Doctor/Admin)
// @route   GET /api/metrics
// @access  Private
export const getMetrics = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (patient) query.patient = patient._id;
      else return res.json([]);
    } else {
      // Doctor or Admin can filter by patientId, or fetch all metrics
      const { patientId } = req.query;
      if (patientId) {
        query.patient = patientId;
      }
    }

    const metrics = await HealthMetric.find(query)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ date: 1 }); // Sort by date ascending for charts

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
