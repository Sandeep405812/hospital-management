import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    specialization: {
      type: String,
      required: [true, 'Please add a specialization'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
    },
    consultationFee: {
      type: Number,
      required: [true, 'Please add a consultation fee'],
      default: 500,
    },
    experience: {
      type: Number,
      required: [true, 'Please add experience in years'],
    },
    qualification: {
      type: String,
      required: [true, 'Please add qualifications'],
    },
    schedule: {
      type: [String],
      default: ['09:00 - 13:00', '14:00 - 17:00'],
    },
    availability: {
      type: Map,
      of: [String],
      default: {
        'Monday': ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'],
        'Tuesday': ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'],
        'Wednesday': ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'],
        'Thursday': ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'],
        'Friday': ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'],
        'Saturday': ['09:00 - 10:00', '10:00 - 11:00'],
        'Sunday': []
      }
    },
    currentToken: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor;
