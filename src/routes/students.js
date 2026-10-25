const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// @route   GET /api/students
// @desc    Get all students (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = { role: 'student' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') {
      query.isActive = status === 'active';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    // Shape data for admin table
    const formatted = students.map((s) => ({
      id: s._id,
      name: s.name,
      email: s.email,
      mobile: s.mobile,
      careerGoal: s.careerGoal || 'Not set',
      skillScore: s.careerReadiness || 0,
      assessment:
        s.assessmentHistory.length > 0
          ? 'Completed'
          : 'Not Started',
      status: s.isActive ? 'active' : 'inactive',
      joined: s.createdAt,
      passportPhoto: s.passportPhoto || { url: '', publicId: '' },
    }));

    res.json({ success: true, count: total, page: parseInt(page), students: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/students/stats
// @desc    Get comprehensive admin dashboard stats
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const Assessment = require('../models/Assessment');
    const Career = require('../models/Career');
    const Project = require('../models/Project');
    const Skill = require('../models/Skill');

    // ── Core counts ─────────────────────────────────────────────────────
    const [
      totalStudents,
      activeStudents,
      totalAssessmentAttempts,
      assessmentCount,
      careerCount,
      projectCount,
      skillCount,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.aggregate([
        { $match: { role: 'student' } },
        { $project: { count: { $size: '$assessmentHistory' } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ]),
      Assessment.countDocuments({ isActive: true }),
      Career.countDocuments({ isActive: true }),
      Project.countDocuments({ isActive: true }),
      Skill.countDocuments({ isActive: true }),
    ]);

    const assessmentAttempts = totalAssessmentAttempts[0]?.total || 0;

    // Count students who have completed at least one assessment
    const completedAssessmentStudents = await User.countDocuments({
      role: 'student',
      'assessmentHistory.0': { $exists: true },
    });

    // ── Student growth by month (last 12 months) ────────────────────────
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const growthPipeline = await User.aggregate([
      { $match: { role: 'student', createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Build cumulative growth data
    let cumulative = 0;
    // Count students before the 12-month window
    const beforeCount = await User.countDocuments({
      role: 'student',
      createdAt: { $lt: twelveMonthsAgo },
    });
    cumulative = beforeCount;

    const studentGrowthData = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-based
      const entry = growthPipeline.find(
        (g) => g._id.year === year && g._id.month === month
      );
      cumulative += entry ? entry.count : 0;
      studentGrowthData.push({
        month: monthNames[d.getMonth()],
        students: cumulative,
        newStudents: entry ? entry.count : 0,
      });
    }

    // ── Career interest distribution (by careerGoal) ────────────────────
    const careerInterestRaw = await User.aggregate([
      { $match: { role: 'student', careerGoal: { $ne: '' } } },
      { $group: { _id: '$careerGoal', value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $limit: 8 },
    ]);

    const chartColors = ['#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#f97316', '#84cc16', '#94a3b8'];
    const careerInterestData = careerInterestRaw.map((item, i) => ({
      name: item._id || 'Not Set',
      value: item.value,
      fill: chartColors[i % chartColors.length],
    }));

    // If fewer than 2 categories, add "Other" for remaining students
    const categorizedCount = careerInterestData.reduce((a, b) => a + b.value, 0);
    const studentsWithGoals = await User.countDocuments({ role: 'student', careerGoal: { $ne: '' } });
    if (categorizedCount < studentsWithGoals) {
      careerInterestData.push({
        name: 'Other',
        value: studentsWithGoals - categorizedCount,
        fill: '#94a3b8',
      });
    }

    // ── Skill demand (from careers' requiredSkills) ──────────────────────
    const skillDemandRaw = await Career.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$requiredSkills' },
      { $group: { _id: '$requiredSkills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    const maxDemand = skillDemandRaw[0]?.count || 1;
    const skillDemandData = skillDemandRaw.map((s) => ({
      skill: s._id,
      demand: Math.round((s.count / maxDemand) * 100),
    }));

    // ── Assessment completion data (from Assessment model) ──────────────
    const assessments = await Assessment.find({ isActive: true }).select(
      'title questions attempts completionRate status'
    );
    const adminAssessments = assessments.map((a) => ({
      id: a._id,
      title: a.title,
      questions: a.questions?.length || 0,
      attempts: a.attempts || 0,
      completionRate: a.completionRate || 0,
      status: a.status || 'active',
    }));

    // Monthly assessment data (from user assessmentHistory)
    const assessmentMonthly = await User.aggregate([
      { $match: { role: 'student' } },
      { $unwind: '$assessmentHistory' },
      { $match: { 'assessmentHistory.date': { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$assessmentHistory.date' },
            month: { $month: '$assessmentHistory.date' },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$assessmentHistory.status', 'completed'] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const assessmentCompletionData = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const entry = assessmentMonthly.find(
        (g) => g._id.year === year && g._id.month === month
      );
      if (entry) {
        assessmentCompletionData.push({
          month: monthNames[d.getMonth()],
          completed: entry.completed,
          attempted: entry.total,
        });
      }
    }
    // Only include months that have data
    if (assessmentCompletionData.length === 0) {
      // Fallback: at least show current month with zeros
      assessmentCompletionData.push({
        month: monthNames[now.getMonth()],
        completed: completedAssessmentStudents,
        attempted: assessmentAttempts,
      });
    }

    // ── Recent activity (last 10 events) ────────────────────────────────
    const recentStudents = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName name createdAt assessmentHistory careerGoal');

    const recentActivity = [];
    for (const student of recentStudents) {
      const sName = student.name || `${student.firstName} ${student.lastName}`;
      // Registration event
      recentActivity.push({
        action: 'New student registered',
        name: sName,
        time: student.createdAt,
        type: 'registration',
      });
      // Assessment completion events
      if (student.assessmentHistory?.length > 0) {
        for (const ah of student.assessmentHistory.slice(-2)) {
          recentActivity.push({
            action: `Assessment completed: ${ah.title || 'Career Assessment'}`,
            name: sName,
            time: ah.date,
            type: 'assessment',
          });
        }
      }
    }
    // Sort by time descending and take top 10
    recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
    const topActivity = recentActivity.slice(0, 10).map((item) => ({
      ...item,
      time: getRelativeTime(item.time),
    }));

    // ── Response ────────────────────────────────────────────────────────
    res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        careerAssessments: assessmentAttempts,
        completedAssessments: completedAssessmentStudents,
        projects: projectCount,
        careerPaths: careerCount,
        skills: skillCount,
        assessments: assessmentCount,
      },
      studentGrowthData,
      careerInterestData,
      skillDemandData,
      assessmentCompletionData,
      adminAssessments,
      recentActivity: topActivity,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Helper: convert a date to relative time string
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

// @route   GET /api/students/:id
// @desc    Get single student (Admin only)
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-password');
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   POST /api/students
// @desc    Create student directly (Admin only)
// @access  Private/Admin
router.post(
  '/',
  protect,
  authorize('admin'),
  upload.single('passportPhoto'),
  async (req, res) => {
    try {
      const { firstName, lastName, email, mobile, password, careerGoal } = req.body;

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ success: false, message: 'First name, last name, email, and password are required.' });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
      }

      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      const passportPhoto = req.file
        ? { url: req.file.path, publicId: req.file.filename }
        : { url: '', publicId: '' };

      const student = await User.create({
        firstName,
        lastName,
        username,
        email,
        mobile: mobile || '',
        password,
        careerGoal: careerGoal || '',
        role: 'student',
        emailVerified: true,
        onboardingCompleted: false,
        careerReadiness: 0,
        progressHistory: [],
        passportPhoto,
      });

      res.status(201).json({
        success: true,
        message: 'Student created successfully.',
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          mobile: student.mobile,
          careerGoal: student.careerGoal || 'Not set',
          skillScore: student.careerReadiness || 0,
          assessment: 'Not Started',
          status: 'active',
          joined: student.createdAt,
          passportPhoto: student.passportPhoto,
        },
      });
    } catch (error) {
      console.error('Create student error:', error);
      res.status(500).json({ success: false, message: error.message || 'Server error.' });
    }
  }
);

// @route   PUT /api/students/:id
// @desc    Update student (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { password, role, ...updates } = req.body; // prevent role & password changes via this route
    const student = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/students/:id/photo
// @desc    Replace a student's passport photo (Admin only)
// @access  Private/Admin
router.put(
  '/:id/photo',
  protect,
  authorize('admin'),
  upload.single('passportPhoto'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo file uploaded.' });
      }

      const student = await User.findById(req.params.id);
      if (!student || student.role !== 'student') {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      // Delete the old Cloudinary asset if it exists
      if (student.passportPhoto?.publicId) {
        try {
          await cloudinary.uploader.destroy(student.passportPhoto.publicId);
        } catch (e) {
          console.warn('Could not delete old Cloudinary photo:', e.message);
        }
      }

      // Save the new photo details
      student.passportPhoto = {
        url:      req.file.path,
        publicId: req.file.filename,
      };
      await student.save();

      res.json({
        success: true,
        message: 'Photo updated successfully.',
        passportPhoto: student.passportPhoto,
      });
    } catch (error) {
      console.error('Photo update error:', error);
      res.status(500).json({ success: false, message: error.message || 'Server error.' });
    }
  }
);

// @route   DELETE /api/students/:id
// @desc    Deactivate student (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, message: 'Student deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/students/me/profile
// @desc    Get own student profile (authenticated student)
// @access  Private
router.get('/me/profile', protect, async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select('-password');
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/students/me/skills
// @desc    Update student skills
// @access  Private
router.put('/me/skills', protect, async (req, res) => {
  try {
    const { skills } = req.body;
    const student = await User.findByIdAndUpdate(
      req.user._id,
      { skills },
      { new: true }
    ).select('-password');
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/students/me/progress
// @desc    Update career readiness
// @access  Private
router.put('/me/progress', protect, async (req, res) => {
  try {
    const { careerReadiness, progressHistory } = req.body;
    const updates = {};
    if (careerReadiness !== undefined) updates.careerReadiness = careerReadiness;
    if (progressHistory) updates.progressHistory = progressHistory;

    const student = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
