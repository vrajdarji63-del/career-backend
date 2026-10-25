const express = require('express');
const Skill = require('../models/Skill');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/skills
// @desc    Get all skills
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category && category !== 'All') query.category = category;

    const skills = await Skill.find(query).sort({ name: 1 });
    res.json({ success: true, count: skills.length, skills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   POST /api/skills
// @desc    Create a skill (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const skill = await Skill.create(req.body);
    res.status(201).json({ success: true, skill });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Skill with this name already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/skills/:id
// @desc    Update a skill (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found.' });
    res.json({ success: true, skill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/skills/:id
// @desc    Delete a skill (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found.' });
    res.json({ success: true, message: 'Skill removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
