const express = require('express');
const Career = require('../models/Career');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/careers
// @desc    Get all active careers
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { isActive: true };

    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const careers = await Career.find(query).sort({ title: 1 });
    res.json({ success: true, count: careers.length, careers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/careers/:id
// @desc    Get single career by slug ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const career = await Career.findOne({ id: req.params.id, isActive: true });
    if (!career) {
      return res.status(404).json({ success: false, message: 'Career not found.' });
    }
    res.json({ success: true, career });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   POST /api/careers
// @desc    Create a new career (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const career = await Career.create(req.body);
    res.status(201).json({ success: true, career });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Career with this ID already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/careers/:id
// @desc    Update a career (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const career = await Career.findOneAndUpdate({ id: req.params.id }, req.body, {
      new: true,
      runValidators: true,
    });
    if (!career) {
      return res.status(404).json({ success: false, message: 'Career not found.' });
    }
    res.json({ success: true, career });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/careers/:id
// @desc    Delete a career (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const career = await Career.findOneAndUpdate(
      { id: req.params.id },
      { isActive: false },
      { new: true }
    );
    if (!career) {
      return res.status(404).json({ success: false, message: 'Career not found.' });
    }
    res.json({ success: true, message: 'Career removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
