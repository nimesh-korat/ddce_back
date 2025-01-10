// multerConfig.js
const multer = require('multer');

// Multer middleware for profile image uploads
const img = multer.memoryStorage();
const uploadImg = multer({
    storage: img,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max file size 10MB
});

module.exports = { uploadImg };
