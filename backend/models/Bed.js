import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema(
  {
    bedNumber: {
      type: String,
      required: [true, 'Please add a bed number'],
      unique: true,
    },
    wardType: {
      type: String,
      required: [true, 'Please select a ward type'],
      enum: ['ICU', 'General', 'Semi-Private', 'Private'],
    },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Maintenance'],
      default: 'Available',
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Bed = mongoose.model('Bed', bedSchema);

export default Bed;
