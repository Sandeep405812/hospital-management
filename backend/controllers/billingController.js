import Billing from '../models/Billing.js';
import Patient from '../models/Patient.js';

// @desc    Get all bills (Filtered by Patient or full list for Admin)
// @route   GET /api/billing
// @access  Private
export const getBills = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (patient) query.patient = patient._id;
    }

    const bills = await Billing.find(query)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phoneNumber' },
      })
      .populate({
        path: 'appointment',
        populate: {
          path: 'doctor',
          populate: { path: 'user', select: 'name' },
        },
      })
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update bill payment status
// @route   PUT /api/billing/:id/pay
// @access  Private
export const payBill = async (req, res) => {
  const { paymentMethod, transactionId } = req.body;

  try {
    const bill = await Billing.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Auth validation: Patients can only pay their own bills
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || bill.patient.toString() !== patient._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to pay this invoice' });
      }
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Invoice has already been paid' });
    }

    bill.status = 'paid';
    bill.paymentMethod = paymentMethod || 'Card';
    bill.transactionId = transactionId || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    bill.date = new Date();

    const updatedBill = await bill.save();

    res.json({
      message: 'Invoice payment completed successfully',
      bill: updatedBill,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
