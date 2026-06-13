import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a medicine name'],
  },
  dosage: {
    type: String,
    required: [true, 'Please add dosage (e.g. 500mg)'],
  },
  frequency: {
    type: String,
    required: [true, 'Please add frequency (e.g. Twice a day)'],
  },
  duration: {
    type: String,
    required: [true, 'Please add duration (e.g. 5 days)'],
  },
});

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
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
    date: {
      type: Date,
      default: Date.now,
    },
    medicines: [medicineSchema],
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;
