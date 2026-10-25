const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date,   required: true },
  verified:  { type: Boolean, default: false },
});

// Auto-delete expired documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
