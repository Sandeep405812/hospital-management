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

// @desc    Get billing analytics
// @route   GET /api/billing/analytics
// @access  Private/Admin
export const getBillingAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    const bills = await Billing.find({});

    let totalPaid = 0;
    let totalUnpaid = 0;
    const paymentMethods = { UPI: 0, Card: 0, Cash: 0, Insurance: 0 };
    const monthlyRevenue = {};

    bills.forEach((bill) => {
      const amt = bill.total || 0;
      if (bill.status === 'paid') {
        totalPaid += amt;
        const method = bill.paymentMethod || 'Card';
        paymentMethods[method] = (paymentMethods[method] || 0) + amt;
        
        const dateObj = bill.date ? new Date(bill.date) : new Date(bill.createdAt);
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + amt;
      } else {
        totalUnpaid += amt;
      }
    });

    // Sort monthly revenue keys
    const sortedMonthlyRevenue = {};
    Object.keys(monthlyRevenue).sort().forEach((key) => {
      sortedMonthlyRevenue[key] = monthlyRevenue[key];
    });

    res.json({
      totalPaid,
      totalUnpaid,
      paymentMethods,
      monthlyRevenue: sortedMonthlyRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update billing amount manually (Admin only)
// @route   PUT /api/billing/:id/amount
// @access  Private/Admin
export const updateBillAmount = async (req, res) => {
  const { amount } = req.body;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    const bill = await Billing.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Cannot modify amount of a paid invoice' });
    }

    const taxRate = 0.18;
    const tax = parseFloat((amount * taxRate).toFixed(2));
    const total = amount + tax;

    bill.amount = amount;
    bill.tax = tax;
    bill.total = total;

    const updated = await bill.save();

    res.json({
      message: 'Invoice fee updated successfully',
      bill: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
