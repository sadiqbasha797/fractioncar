const multer = require('multer');
const path = require('path');

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Store files in a temporary directory
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Create a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bulk-upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create the multer instance for Excel/CSV files
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit file size to 10MB
  },
  fileFilter: function (req, file, cb) {
    // Accept Excel and CSV files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv' // .csv alternative
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed!'), false);
    }
  }
});

module.exports = upload;

