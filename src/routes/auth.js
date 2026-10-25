const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Career = require('../models/Career');
const { protect } = require('../middleware/auth');
const { sendOTPEmail } = require('../config/mailer');
const upload = require('../middleware/upload');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      emailVerified: user.emailVerified,
      passportPhoto: user.passportPhoto,
    },
  });
};

// ─── Helper: generate 6-digit OTP ────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
// Generates & emails a 6-digit OTP for email verification (pre-registration)
router.post(
  '/send-otp',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    try {
      const { email, firstName } = req.body;

      // Check if email already fully registered and verified
      const existingUser = await User.findOne({ email, emailVerified: true });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'This email is already registered.' });
      }

      // Rate-limit: max 10 OTP requests per 10 min per email
      const recentCount = await OTP.countDocuments({
        email: email.toLowerCase(),
        expiresAt: { $gt: new Date() },
      });
      if (recentCount >= 10) {
        return res.status(429).json({
          success: false,
          message: 'Too many OTP requests. Please wait a few minutes before trying again.',
        });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any old unverified OTPs for this email
      await OTP.deleteMany({ email: email.toLowerCase() });

      // Save new OTP
      await OTP.create({ email: email.toLowerCase(), otp, expiresAt });

      // Send email (try Brevo / SMTP, but fallback so students are never blocked by cloud firewall)
      let emailSent = false;
      try {
        await sendOTPEmail(email, otp, firstName || '');
        emailSent = true;
      } catch (emailErr) {
        console.warn(`⚠️ [OTP Mailer] Delivery failed (${emailErr.message}). Falling back to direct verification.`);
      }

      if (emailSent) {
        res.json({ success: true, message: `Verification code sent to ${email}` });
      } else {
        res.json({
          success: true,
          message: `Verification code: ${otp} (Email blocked by cloud host - enter this code to verify)`,
          demoOtp: otp,
        });
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to send verification email. Please check your email address and try again.' });
    }
  }
);

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Verifies the OTP — marks it as verified so register can proceed
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    try {
      const { email, otp } = req.body;

      const record = await OTP.findOne({
        email: email.toLowerCase(),
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (!record) {
        return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new code.' });
      }

      if (record.otp !== otp.trim()) {
        return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
      }

      // Mark as verified
      record.verified = true;
      await record.save();

      res.json({ success: true, message: 'Email verified successfully.' });
    } catch (err) {
      console.error('Verify OTP error:', err);
      res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
    }
  }
);

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Accepts multipart/form-data so the passport photo can be uploaded alongside
// the registration fields.
router.post(
  '/register',
  // Multer runs first: uploads photo to Cloudinary (field name: passportPhoto)
  upload.single('passportPhoto'),
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('mobile').matches(/^[0-9]{10}$/).withMessage('Mobile must be 10 digits'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    try {
      const { firstName, lastName, email, mobile, password } = req.body;

      // ✅ Require a verified OTP before creating account
      const verifiedOTP = await OTP.findOne({
        email: email.toLowerCase(),
        verified: true,
        expiresAt: { $gt: new Date() },
      });
      if (!verifiedOTP) {
        return res.status(403).json({
          success: false,
          message: 'Email not verified. Please complete OTP verification first.',
        });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered.' });
      }

      // Auto-generate username from email prefix
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      // ── Passport photo (optional — multer places it in req.file) ────────────
      const passportPhoto = req.file
        ? { url: req.file.path, publicId: req.file.filename }
        : { url: '', publicId: '' };

      const user = await User.create({
        firstName, lastName, username, email, mobile, password,
        role: 'student',
        emailVerified: true,          // ← verified via OTP
        onboardingCompleted: false,
        careerReadiness: 0,
        progressHistory: [],
        passportPhoto,
      });

      // Clean up the used OTP
      await OTP.deleteMany({ email: email.toLowerCase() });

      sendTokenResponse(user, 201, res);
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: err.message || 'Server error during registration.' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      if (!user.isActive) {
        return res.status(401).json({ success: false, message: 'Account has been deactivated.' });
      }
      sendTokenResponse(user, 200, res);
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Server error during login.' });
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/onboarding ────────────────────────────────────────────────
router.post('/onboarding', protect, async (req, res) => {
  try {
    const { interests, selectedSkills } = req.body;
    const allCareers = await Career.find({ isActive: true });

    const categoryMap = {
      'Web Development':         ['frontend-developer', 'backend-developer', 'fullstack-developer'],
      'Data & Analytics':        ['data-analyst', 'data-scientist'],
      'Artificial Intelligence': ['ai-ml-engineer', 'data-scientist'],
      'Infrastructure & DevOps': ['cloud-engineer', 'devops-engineer'],
      'Cybersecurity':           ['cybersecurity-analyst'],
      'UI/UX Design':            ['ui-ux-designer', 'frontend-developer'],
    };

    const skillProfMap = {
      'HTML': 50, 'CSS': 50, 'JavaScript': 30, 'Python': 30,
      'SQL': 25, 'Git': 40, 'React': 20, 'Node.js': 15,
    };

    const matchedIds = new Set();
    interests.forEach((interest) => {
      (categoryMap[interest] || []).forEach((id) => matchedIds.add(id));
    });

    const careerMatches = allCareers
      .map((career) => {
        let score = 0;
        if (matchedIds.has(career.id)) score += 60;
        const knownSkills = selectedSkills || [];
        career.requiredSkills.forEach((sk) => {
          if (knownSkills.includes(sk)) score += 8;
        });
        score = Math.min(95, score);
        return { title: career.title, id: career.id, match: score, color: career.color };
      })
      .filter((c) => c.match > 0)
      .sort((a, b) => b.match - a.match)
      .slice(0, 5);

    const topCareer = careerMatches[0] || { title: 'Frontend Developer', id: 'frontend-developer', match: 65, color: '#6366f1' };

    const skills = (selectedSkills || []).map((name) => ({
      name,
      proficiency: skillProfMap[name] || 20,
    }));

    const careerReadiness = skills.length > 0
      ? Math.min(60, Math.round(skills.reduce((s, sk) => s + sk.proficiency, 0) / skills.length))
      : 10;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        interests, selectedSkills, skills,
        onboardingCompleted: true,
        careerGoal: topCareer.title,
        careerReadiness,
        careerMatches,
        recommendedCareer: { title: topCareer.title, match: topCareer.match, id: topCareer.id },
        aiRecommendation: `Based on your interest in ${interests[0] || 'technology'}, focus on ${topCareer.title} skills to maximize your career readiness.`,
        currentRoadmap: { title: `${topCareer.title} Roadmap`, progress: 0 },
      },
      { new: true }
    );

    res.json({ success: true, user, careerMatches, topCareer });
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

// ─── PUT /api/auth/update-profile ────────────────────────────────────────────
router.put('/update-profile', protect, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'location', 'mobile', 'bio', 'education', 'careerGoal', 'interests'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
