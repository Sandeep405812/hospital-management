# 🏥 Real-Time Hospital Management System

[![React](https://img.shields.io/badge/Frontend-React-61DAFB.svg?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green.svg?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248.svg?logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/RealTime-Socket.io-010101.svg?logo=socket.io)](https://socket.io/)
[![GSAP](https://img.shields.io/badge/UI-GSAP_Animations-88CE02.svg?logo=greensock)](https://greensock.com/gsap/)

A full-stack, real-time healthcare management system built to manage appointments, patient records, doctor schedules, and live notifications.

---

## 🌟 Key Features

- ⚡ **Real-Time Synchronisation:** Live appointment notifications and queue status using **Socket.IO**.
- 🎬 **Modern Animated UI:** Smooth micro-interactions and transitions with **GSAP**.
- 🧑‍⚕️ **Doctor & Patient Portals:** Role-based access for hospital administrators, staff, doctors, and patients.
- 📁 **File & Prescription Uploads:** Secure multi-part document storage powered by **Multer**.
- 🛡️ **Authentication:** Secure token-based access with JWT and bcrypt password hashing.

---

## 🛠️ Tech Stack

- **Frontend:** React, React Router DOM, GSAP (GreenSock), Lucide React, Socket.io-client
- **Backend:** Node.js, Express.js, MongoDB, Mongoose, Socket.IO, Multer, JWT, Bcrypt

---

## 🚀 Quick Start (Local Setup)

### 1. Clone the repository
```bash
git clone https://github.com/Sandeep405812/hospital-management.git
cd hospital-management
```

### 2. Backend Setup
```bash
cd backend
npm install
# Set your .env variables: PORT, MONGO_URI, JWT_SECRET
npm start
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm start
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
