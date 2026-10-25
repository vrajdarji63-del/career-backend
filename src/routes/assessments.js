const express = require('express');
const Assessment = require('../models/Assessment');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/assessments
// @desc    Get all active assessments
// @access  Public
router.get('/', async (req, res) => {
  try {
    const assessments = await Assessment.find({ isActive: true });
    res.json({ success: true, count: assessments.length, assessments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/assessments/:id
// @desc    Get single assessment with questions
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' });
    res.json({ success: true, assessment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   POST /api/assessments/:id/submit
// @desc    Submit assessment answers
// @access  Private
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const { answers, score } = req.body;
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' });

    // Increment attempt counter
    assessment.attempts += 1;
    await assessment.save();

    // Add to user's assessment history
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        assessmentHistory: {
          title: assessment.title,
          score: score || 0,
          date: new Date(),
          status: 'completed',
        },
      },
    });

    res.json({ success: true, message: 'Assessment submitted successfully.', score });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/assessments
// @desc    Create assessment (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const assessment = await Assessment.create(req.body);
    res.status(201).json({ success: true, assessment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/assessments/:id
// @desc    Update assessment (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' });
    res.json({ success: true, assessment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/assessments/:id
// @desc    Delete assessment (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' });
    res.json({ success: true, message: 'Assessment removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
