import fs from 'fs';
import path from 'path';
import multer from 'multer';
import Report from '../models/Report.js';
import Patient from '../models/Patient.js';

// Configure Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `report-${Date.now()}${ext}`);
  },
});

// Configure File Type Filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, PNG, JPG, and JPEG documents are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
});

// @desc    Upload patient health report
// @route   POST /api/reports/upload
// @access  Private (Patient only)
export const uploadReport = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(403).json({ message: 'Only patients can upload reports' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { title } = req.body;
    if (!title) {
      // Remove file if title is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Please add a report title' });
    }

    const report = await Report.create({
      patient: patient._id,
      title,
      fileName: req.file.filename,
      filePath: `/uploads/${req.file.filename}`,
    });

    res.status(201).json({
      message: 'Report uploaded successfully',
      report,
    });
  } catch (error) {
    // Cleanup uploaded file on error if it was saved
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reports list (Filtered by Patient profile, or Patient Query for Doctor/Admin)
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (patient) query.patient = patient._id;
    } else {
      // Admin/Doctor can specify patientId in query
      const { patientId } = req.query;
      if (patientId) {
        query.patient = patientId;
      } else {
        return res.status(400).json({ message: 'Please specify patientId query parameter' });
      }
    }

    const reports = await Report.find(query).sort({ date: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete health report
// @route   DELETE /api/reports/:id
// @access  Private (Patient / Admin)
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('patient');
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check authorization: User can only delete their own reports (unless Admin)
    if (req.user.role !== 'admin') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || report.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this report' });
      }
    }

    // Delete file from disk
    const systemPath = path.join(process.cwd(), report.filePath);
    if (fs.existsSync(systemPath)) {
      fs.unlinkSync(systemPath);
    }

    // Delete record from DB
    await Report.findByIdAndDelete(req.params.id);

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
