import mongoose from 'mongoose';

const dischargeSummarySchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    bedNumber: {
      type: String,
      required: true,
    },
    wardType: {
      type: String,
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
    },
    treatment: {
      type: String,
      required: true,
    },
    condition: {
      type: String,
      enum: ['Stable', 'Improved', 'Recovered', 'Referred'],
      required: true,
    },
    followUp: {
      type: String,
      default: '',
    },
    admissionDate: {
      type: Date,
      required: true,
    },
    dischargeDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const DischargeSummary = mongoose.model('DischargeSummary', dischargeSummarySchema);

export default DischargeSummary;
