import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from './models/Appointment.js';
import User from './models/User.js';
import Patient from './models/Patient.js';
import Doctor from './models/Doctor.js';

dotenv.config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hospital_management');
    console.log('Connected to Database.');

    const users = await User.find({});
    console.log(`\nTotal Users: ${users.length}`);
    users.forEach(u => console.log(`- ${u.name} (${u.role}): ${u.email}`));

    const patients = await Patient.find({}).populate('user', 'name');
    console.log(`\nTotal Patients: ${patients.length}`);
    patients.forEach(p => console.log(`- Patient ID: ${p._id}, User: ${p.user?.name}`));

    const doctors = await Doctor.find({}).populate('user', 'name');
    console.log(`\nTotal Doctors: ${doctors.length}`);
    doctors.forEach(d => console.log(`- Doctor ID: ${d._id}, User: ${d.user?.name}`));

    const appointments = await Appointment.find({})
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name' }
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name' }
      });
      
    console.log(`\nTotal Appointments: ${appointments.length}`);
    appointments.forEach((app, idx) => {
      console.log(`${idx + 1}. [${app.status}] Date: ${app.date?.toISOString().split('T')[0]}, Slot: ${app.timeSlot}`);
      console.log(`   Patient: ${app.patient?.user?.name || 'NULL Patient user'} (ID: ${app.patient?._id})`);
      console.log(`   Doctor: ${app.doctor?.user?.name || 'NULL Doctor user'} (ID: ${app.doctor?._id})`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Diagnostic error:', err);
  }
}

diagnose();
