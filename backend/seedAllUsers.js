import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Doctor from './models/Doctor.js';
import Patient from './models/Patient.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ss9918272164_db_user:sandeep9918@as.kebxijm.mongodb.net/hospital_management?appName=as';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas successfully.');

    const defaultPassword = 'password123';

    const usersToSeed = [
      {
        email: 'superadmin@hospital.com',
        name: 'Dr. A. S. Verma (Super Admin & Director)',
        role: 'superadmin',
        adminType: 'super_admin',
        department: 'Hospital Board of Directors',
        phoneNumber: '+91 99182 72164',
        gender: 'Male',
        status: 'Active',
      },
      {
        email: 'doctoradmin@hospital.com',
        name: 'Vikram Mehta (Doctor & OPD Manager)',
        role: 'admin_doctors',
        adminType: 'doctor_manager',
        department: 'Doctor & Department Operations',
        phoneNumber: '+91 98765 43211',
        gender: 'Male',
        status: 'Active',
      },
      {
        email: 'bedadmin@hospital.com',
        name: 'Priya Sharma (In-Patient & Bed Manager)',
        role: 'admin_beds',
        adminType: 'bed_manager',
        department: 'IPD Ward & Bed Logistics',
        phoneNumber: '+91 98765 43212',
        gender: 'Female',
        status: 'Active',
      },
      {
        email: 'helpdeskadmin@hospital.com',
        name: 'Anjali Gupta (Helpdesk & Reception Head)',
        role: 'admin_helpdesk',
        adminType: 'helpdesk_manager',
        department: 'Front Desk & Help Center',
        phoneNumber: '+91 98765 43213',
        gender: 'Female',
        status: 'Active',
      },
      {
        email: 'staffadmin@hospital.com',
        name: 'Rajesh Khanna (Staff & HR Operations)',
        role: 'admin_staff',
        adminType: 'staff_manager',
        department: 'Human Resources & Nursing Staff',
        phoneNumber: '+91 98765 43214',
        gender: 'Male',
        status: 'Active',
      },
      {
        email: 'admin@hospital.com',
        name: 'Hospital Administrator',
        role: 'admin',
        department: 'Hospital Administration',
        phoneNumber: '+91 98765 43210',
        gender: 'Male',
        status: 'Active',
      },
      {
        email: 'receptionist@hospital.com',
        name: 'Front Desk Receptionist',
        role: 'receptionist',
        department: 'Front Desk',
        phoneNumber: '+91 98765 43215',
        gender: 'Female',
        status: 'Active',
      },
      {
        email: 'doctor@hospital.com',
        name: 'Dr. Rajesh Sharma',
        role: 'doctor',
        department: 'Cardiology',
        phoneNumber: '+91 98765 43216',
        gender: 'Male',
        status: 'Active',
      },
      {
        email: 'patient@hospital.com',
        name: 'Rahul Sharma',
        role: 'patient',
        department: 'General',
        phoneNumber: '+91 98765 43217',
        gender: 'Male',
        status: 'Active',
      },
    ];

    for (const uData of usersToSeed) {
      let user = await User.findOne({ email: uData.email });
      if (!user) {
        user = await User.create({
          ...uData,
          password: defaultPassword,
        });
        console.log(`Created user: ${uData.email} (${uData.role})`);
      } else {
        // Reset password & role to ensure active access
        user.role = uData.role;
        user.password = defaultPassword; // Pre-save hook will hash it
        if (uData.adminType) user.adminType = uData.adminType;
        if (uData.department) user.department = uData.department;
        user.status = 'Active';
        await user.save();
        console.log(`Updated user password & role: ${uData.email} (${uData.role})`);
      }

      // Check Doctor profile
      if (uData.role === 'doctor') {
        const docProfile = await Doctor.findOne({ user: user._id });
        if (!docProfile) {
          await Doctor.create({
            user: user._id,
            specialization: 'Cardiology & Internal Medicine',
            consultationFee: 500,
            experience: 12,
            qualification: 'MBBS, MD (Medicine)',
          });
          console.log(`Created doctor profile for ${uData.email}`);
        }
      }

      // Check Patient profile
      if (uData.role === 'patient') {
        const patProfile = await Patient.findOne({ user: user._id });
        if (!patProfile) {
          await Patient.create({
            user: user._id,
            patientId: 'PID-1001',
            dateOfBirth: new Date('1995-05-15'),
            bloodType: 'O+',
            emergencyContact: '+91 98765 43218',
          });
          console.log(`Created patient profile for ${uData.email}`);
        }
      }
    }

    console.log('\n--- ALL USERS SEEDED SUCCESSFULLY WITH PASSWORD: password123 ---');
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
};

seed();
