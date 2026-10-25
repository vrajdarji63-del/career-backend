const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    questions: [
      {
        question: { type: String, required: true },
        options: [
          {
            id: { type: String },
            label: { type: String },
            value: { type: String },
            careers: [{ type: String }],
          },
        ],
      },
    ],
    attempts: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assessment', assessmentSchema);
