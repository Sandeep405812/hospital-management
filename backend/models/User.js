import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: [
        'superadmin',
        'admin',
        'admin_doctors',
        'admin_staff',
        'admin_helpdesk',
        'admin_beds',
        'doctor',
        'patient',
        'receptionist',
      ],
      default: 'patient',
    },
    department: {
      type: String,
      default: 'General',
    },
    adminType: {
      type: String,
      enum: ['super_admin', 'doctor_manager', 'staff_manager', 'helpdesk_manager', 'bed_manager', 'none'],
      default: 'none',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended'],
      default: 'Active',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    phoneNumber: {
      type: String,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
