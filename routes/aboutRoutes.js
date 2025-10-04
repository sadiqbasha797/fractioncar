const express = require('express');
const router = express.Router();
const aboutController = require('../controllers/aboutController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');

// ==================== PUBLIC ROUTES ====================

// Public route for About content
router.get('/public', aboutController.getPublicAbout);

// ==================== PROTECTED ROUTES (Admin/SuperAdmin) ====================

// All routes below this line require admin or superadmin authentication
router.use(authMiddleware(['admin', 'superadmin']));

// ==================== ABOUT ROUTES ====================

// Create a new About content
router.post('/', upload.single('aboutheroimage'), aboutController.createAbout);

// Get all About content
router.get('/', aboutController.getAbout);

// Get About content by ID
router.get('/:id', aboutController.getAboutById);

// Update About content by ID
router.put('/:id', upload.single('aboutheroimage'), aboutController.updateAbout);

// Delete About content by ID
router.delete('/:id', aboutController.deleteAbout);

module.exports = router;
