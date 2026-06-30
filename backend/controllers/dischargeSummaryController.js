import DischargeSummary from '../models/DischargeSummary.js';
import Patient from '../models/Patient.js';

// @desc    Get patient discharge summaries
// @route   GET /api/beds/discharge-summaries
// @access  Private
export const getDischargeSummaries = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        return res.status(404).json({ message: 'Patient profile not found' });
      }
      query.patient = patient._id;
    } else {
      // Admin/Doctor/Receptionist can query by patientId query parameter
      const { patientId } = req.query;
      if (patientId) {
        query.patient = patientId;
      }
    }

    const summaries = await DischargeSummary.find(query)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phoneNumber gender' }
      })
      .sort({ dischargeDate: -1 });

    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
