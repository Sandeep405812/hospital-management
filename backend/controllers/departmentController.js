import Department from '../models/Department.js';

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().populate({
      path: 'headOfDepartment',
      populate: { path: 'user', select: 'name email' },
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a department (Admin only)
// @route   POST /api/departments
// @access  Private/Admin
export const createDepartment = async (req, res) => {
  const { name, description, headOfDepartment } = req.body;

  try {
    const departmentExists = await Department.findOne({ name });
    if (departmentExists) {
      return res.status(400).json({ message: 'Department already exists' });
    }

    const department = await Department.create({
      name,
      description,
      headOfDepartment: headOfDepartment || null,
    });

    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update department (Admin only)
// @route   PUT /api/departments/:id
// @access  Private/Admin
export const updateDepartment = async (req, res) => {
  const { name, description, headOfDepartment } = req.body;

  try {
    const department = await Department.findById(req.params.id);

    if (department) {
      department.name = name || department.name;
      department.description = description || department.description;
      if (headOfDepartment !== undefined) {
        department.headOfDepartment = headOfDepartment || null;
      }

      const updatedDepartment = await department.save();
      const populated = await Department.findById(updatedDepartment._id).populate({
        path: 'headOfDepartment',
        populate: { path: 'user', select: 'name email' },
      });

      res.json(populated);
    } else {
      res.status(404).json({ message: 'Department not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete department (Admin only)
// @route   DELETE /api/departments/:id
// @access  Private/Admin
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (department) {
      await Department.findByIdAndDelete(req.params.id);
      res.json({ message: 'Department removed' });
    } else {
      res.status(404).json({ message: 'Department not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
