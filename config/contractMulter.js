const multer = require('multer');
const path = require('path');

// Configure storage for multer - using memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// Create the multer instance for contract documents
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit file size to 10MB for PDFs
  },
  fileFilter: function (req, file, cb) {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for contract documents!'), false);
    }
  }
});

module.exports = upload;
