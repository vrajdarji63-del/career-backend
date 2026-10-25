const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      enum: ['Frontend', 'Backend', 'Database', 'DevOps', 'Cloud', 'Tools', 'Other'],
      default: 'Frontend',
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    studentsLearning: { type: Number, default: 0 },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: '📚' },
    status: {
      type: String,
      enum: ['strong', 'medium', 'high-priority', 'not-started'],
      default: 'not-started',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Skill', skillSchema);
