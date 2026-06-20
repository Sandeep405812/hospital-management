import mongoose from 'mongoose';

const surgerySchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    otName: {
      type: String,
      required: [true, 'Please select an Operation Theatre'],
      enum: ['OT-1', 'OT-2', 'OT-3'],
    },
    date: {
      type: Date,
      required: [true, 'Please select a surgery date'],
    },
    startTime: {
      type: String,
      required: [true, 'Please specify start time (HH:MM)'],
    },
    endTime: {
      type: String,
      required: [true, 'Please specify end time (HH:MM)'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

const Surgery = mongoose.model('Surgery', surgerySchema);

export default Surgery;
