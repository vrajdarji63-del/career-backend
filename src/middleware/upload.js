const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// ─── Cloudinary Storage for passport photos ───────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'career-platform/passport-photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      // Crop to passport-photo aspect ratio (3:4) and resize
      { width: 600, height: 800, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
    public_id: (req, file) => {
      // Use email prefix + timestamp for unique naming
      const email = (req.body.email || 'user').split('@')[0].replace(/[^a-z0-9]/gi, '');
      return `passport_${email}_${Date.now()}`;
    },
  },
});

// ─── File filter: images only ─────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for passport photo.'), false);
  }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

module.exports = upload;
