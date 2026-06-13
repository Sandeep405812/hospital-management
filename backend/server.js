import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

// Model imports for seeding
import User from './models/User.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Ensure uploads directory exists for patient reports
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
}

const app = express();
const server = http.createServer(app);

// Initialize Socket.io signaling server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Socket.io Real-Time Signaling Protocol for WebRTC Telemedicine Call
io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // User joins the virtual consultation room corresponding to their Appointment ID
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    console.log(`User ${userName} (${userId}) joined room ${roomId}`);
    
    // Notify other peer in the room
    socket.to(roomId).emit('user-joined', { userId, userName, socketId: socket.id });
  });

  // Relay WebRTC Offer
  socket.on('offer', ({ roomId, sdp }) => {
    socket.to(roomId).emit('offer', { sdp });
  });

  // Relay WebRTC Answer
  socket.on('answer', ({ roomId, sdp }) => {
    socket.to(roomId).emit('answer', { sdp });
  });

  // Relay WebRTC ICE Candidates
  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { candidate });
  });

  // User leaves the consultation room
  socket.on('leave-room', ({ roomId, userName }) => {
    console.log(`User ${userName} left room ${roomId}`);
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', { userName });
  });

  socket.on('disconnect', () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static uploaded reports
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.send('Hospital Management System API (with Telemedicine & Uploads) is running...');
});

// Seed default admin if none exists
const seedAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      await User.create({
        name: 'System Admin',
        email: 'admin@hospital.com',
        password: 'adminpassword123',
        role: 'admin',
        phoneNumber: '1234567890',
        gender: 'Male',
      });
      console.log('Seeded default admin user: admin@hospital.com / adminpassword123');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error.message);
  }
};
seedAdmin();

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Listen using the HTTP server wrapper (crucial for Socket.io)
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
