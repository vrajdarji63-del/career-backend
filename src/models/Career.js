const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // slug id e.g. 'frontend-developer'
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    description_long: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    matchPercentage: { type: Number, default: 0 },
    avgSalary: { type: String, default: '' },
    jobGrowth: { type: String, default: '' },
    requiredSkills: [{ type: String }],
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: '💼' },
    roadmap: [{ type: String }],
    projects: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Career', careerSchema);
