const express = require('express');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { difficulty, category, search } = req.query;
    const query = { isActive: true };
    if (difficulty && difficulty !== 'All') query.difficulty = difficulty;
    if (category && category !== 'All') query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };

    const projects = await Project.find(query).sort({ popularity: -1 });
    res.json({ success: true, count: projects.length, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   POST /api/projects
// @desc    Create a project (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, message: 'Project removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
