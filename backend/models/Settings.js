import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    upiId: {
      type: String,
      default: 'admin.carehms@icici',
    },
    bankName: {
      type: String,
      default: 'ICICI Bank Ltd.',
    },
    accountName: {
      type: String,
      default: 'AS HOSPITAL General Account',
    },
    accountNumber: {
      type: String,
      default: '91820038190',
    },
    ifscCode: {
      type: String,
      default: 'ICIC0000192',
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
