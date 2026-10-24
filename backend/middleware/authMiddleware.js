import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Optional auth - attaches req.user if token is present, but doesn't block guests
export const optionalProtect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Continue as guest if token is expired/invalid
      req.user = null;
    }
  }
  next();
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const role = req.user.role;
    // Superadmin has absolute global access to all routes
    if (role === 'superadmin') {
      return next();
    }
    // General Admin has system-wide administrative access
    if (role === 'admin') {
      return next();
    }
    // Explicit role match
    if (roles.includes(role)) {
      return next();
    }
    // Specialized Domain Admin permissions:
    // Bed Admin can manage beds, wards, and discharge summaries
    if (role === 'admin_beds' && (roles.includes('admin') || roles.includes('receptionist') || roles.includes('beds'))) {
      return next();
    }
    // Doctor Admin can manage doctors, departments, and medical schedules
    if (role === 'admin_doctors' && (roles.includes('admin') || roles.includes('doctor') || roles.includes('doctors'))) {
      return next();
    }
    // Helpdesk Admin can manage appointments, tokens, and patient reception
    if (role === 'admin_helpdesk' && (roles.includes('admin') || roles.includes('receptionist') || roles.includes('appointment'))) {
      return next();
    }
    // Staff Admin can manage staff records and personnel
    if (role === 'admin_staff' && (roles.includes('admin') || roles.includes('staff'))) {
      return next();
    }
    return res.status(403).json({
      message: `User role ${req.user.role} is not authorized to access this route`,
    });
  };
};
