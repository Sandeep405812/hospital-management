import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
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
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Please add an appointment date'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Please select a time slot'],
    },
    symptoms: {
      type: String,
      required: [true, 'Please describe your symptoms'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'cancelled', 'completed', 'ongoing'],
      default: 'pending',
    },
    fee: {
      type: Number,
      required: true,
      default: 500,
    },
    tokenNumber: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
