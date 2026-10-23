import Hospital from '../models/Hospital.js';

// @desc    Get all connected hospitals / branches
// @route   GET /api/hospitals
// @access  Public / Private
export const getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find({ isActive: true });
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new hospital branch
// @route   POST /api/hospitals
// @access  Private/Admin
export const createHospital = async (req, res) => {
  try {
    const { name, code, city, address, contactNumber } = req.body;
    const exists = await Hospital.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({ message: 'Hospital with this code already exists' });
    }
    const hospital = await Hospital.create({
      name,
      code: code.toUpperCase(),
      city,
      address,
      contactNumber,
    });
    res.status(201).json(hospital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
