const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    skills: [{ type: String }],
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    estimatedTime: { type: String, default: '' },
    category: { type: String, default: 'Web Development' },
    status: {
      type: String,
      enum: ['recommended', 'in-progress', 'not-started', 'completed'],
      default: 'not-started',
    },
    popularity: { type: Number, default: 0 },
    icon: { type: String, default: '📁' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
