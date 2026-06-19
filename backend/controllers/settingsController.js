import Settings from '../models/Settings.js';

// @desc    Get hospital settings
// @route   GET /api/settings
// @access  Private
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({});
    
    // If no settings exist yet, create a default record
    if (!settings) {
      settings = await Settings.create({});
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update hospital settings (Admin only)
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = async (req, res) => {
  const { upiId, bankName, accountName, accountNumber, ifscCode } = req.body;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    let settings = await Settings.findOne({});

    if (!settings) {
      settings = new Settings();
    }

    settings.upiId = upiId !== undefined ? upiId : settings.upiId;
    settings.bankName = bankName !== undefined ? bankName : settings.bankName;
    settings.accountName = accountName !== undefined ? accountName : settings.accountName;
    settings.accountNumber = accountNumber !== undefined ? accountNumber : settings.accountNumber;
    settings.ifscCode = ifscCode !== undefined ? ifscCode : settings.ifscCode;

    const updated = await settings.save();

    res.json({
      message: 'Payment settings updated successfully',
      settings: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
