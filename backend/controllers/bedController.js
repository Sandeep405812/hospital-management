import Bed from '../models/Bed.js';
import Patient from '../models/Patient.js';
import DischargeSummary from '../models/DischargeSummary.js';

// @desc    Get all beds list
// @route   GET /api/beds
// @access  Private
export const getBeds = async (req, res) => {
  try {
    const beds = await Bed.find().populate({
      path: 'patient',
      populate: { path: 'user', select: 'name email phoneNumber gender' },
    });
    res.json(beds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new hospital bed
// @route   POST /api/beds
// @access  Private/Admin/Receptionist
export const createBed = async (req, res) => {
  const { bedNumber, wardType } = req.body;
  try {
    const exists = await Bed.findOne({ bedNumber });
    if (exists) {
      return res.status(400).json({ message: 'Bed number already exists' });
    }
    const bed = await Bed.create({ bedNumber, wardType });
    res.status(201).json(bed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admit patient to bed
// @route   PUT /api/beds/admit
// @access  Private/Admin/Receptionist
export const admitPatient = async (req, res) => {
  const { bedId, patientId } = req.body;
  try {
    const bed = await Bed.findById(bedId);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }
    if (bed.status !== 'Available') {
      return res.status(400).json({ message: 'Bed is occupied or under maintenance' });
    }

    // Check if patient is already admitted
    const alreadyAdmitted = await Bed.findOne({ patient: patientId, status: 'Occupied' });
    if (alreadyAdmitted) {
      return res.status(400).json({ message: `Patient is already admitted to Bed ${alreadyAdmitted.bedNumber}` });
    }

    bed.patient = patientId;
    bed.status = 'Occupied';
    await bed.save();

    const updatedBed = await Bed.findById(bedId).populate({
      path: 'patient',
      populate: { path: 'user', select: 'name email phoneNumber gender' },
    });

    res.json({ message: 'Patient admitted successfully', bed: updatedBed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Discharge patient from bed
// @route   PUT /api/beds/:id/discharge
// @access  Private/Admin/Receptionist
export const dischargePatient = async (req, res) => {
  const { diagnosis, treatment, condition, followUp } = req.body;
  try {
    const bed = await Bed.findById(req.params.id);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }
    if (!bed.patient) {
      return res.status(400).json({ message: 'No patient currently admitted to this bed' });
    }

    // Record the Discharge Summary logs in the database
    await DischargeSummary.create({
      patient: bed.patient,
      bedNumber: bed.bedNumber,
      wardType: bed.wardType,
      diagnosis: diagnosis || 'N/A',
      treatment: treatment || 'N/A',
      condition: condition || 'Stable',
      followUp: followUp || '',
      admissionDate: bed.updatedAt || new Date(Date.now() - 5*24*60*60*1000),
    });

    bed.patient = null;
    bed.status = 'Available';
    await bed.save();

    res.json({ message: 'Patient discharged and bed is now vacant', bed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
