const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName:  { type: String, required: [true, 'Last name is required'],  trim: true },
    username:  { type: String, required: [true, 'Username is required'], unique: true, trim: true, lowercase: true },
    email: {
      type: String, required: true, unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    mobile: { type: String, default: '' },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    emailVerified: { type: Boolean, default: false },

    // Onboarding
    onboardingCompleted: { type: Boolean, default: false },
    interests: [{ type: String }],   // e.g. ['Web Development', 'AI/ML']
    selectedSkills: [{ type: String }],

    // Profile
    location: { type: String, default: '' },
    bio:      { type: String, default: '' },
    education: {
      university: String, degree: String, graduationYear: Number, gpa: String,
    },
    careerGoal: { type: String, default: '' },

    // Career & progress
    skills: [{ name: String, proficiency: { type: Number, default: 0 } }],
    careerReadiness: { type: Number, default: 0 },
    recommendedCareer: {
      title: { type: String, default: '' },
      match: { type: Number, default: 0 },
      id:    { type: String, default: '' },
    },
    careerMatches: [
      {
        title: String, id: String, match: Number, color: String,
      },
    ],
    currentRoadmap: { title: { type: String, default: '' }, progress: { type: Number, default: 0 } },
    assessmentHistory: [
      { title: String, score: Number, date: { type: Date, default: Date.now }, status: String },
    ],
    progressHistory: [{ month: String, score: Number }],
    aiRecommendation: { type: String, default: '' },
    // Passport Photo (stored on Cloudinary)
    passportPhoto: {
      url:      { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Virtual: full name
userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});


userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
