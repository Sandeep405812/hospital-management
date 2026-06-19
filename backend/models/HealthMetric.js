import mongoose from 'mongoose';

const healthMetricSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Blood Pressure (Systolic)', 'Blood Sugar', 'Heart Rate', 'Weight'],
    },
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const HealthMetric = mongoose.model('HealthMetric', healthMetricSchema);

export default HealthMetric;
