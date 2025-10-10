const express = require('express');
const router = express.Router();
const blockedDateController = require('../controllers/blockedDateController');
const authMiddleware = require('../middleware/authMiddleware');

// Create blocked date (Admin/SuperAdmin only)
router.post('/', authMiddleware(['admin', 'superadmin']), blockedDateController.createBlockedDate);

// Get all blocked dates (Admin/SuperAdmin only)
router.get('/', authMiddleware(['admin', 'superadmin']), blockedDateController.getBlockedDates);

// Get blocked dates for a specific car (Public API)
router.get('/car/:carId', blockedDateController.getCarBlockedDates);

// Update blocked date (Admin/SuperAdmin only)
router.put('/:id', authMiddleware(['admin', 'superadmin']), blockedDateController.updateBlockedDate);

// Delete blocked date (Admin/SuperAdmin only)
router.delete('/:id', authMiddleware(['admin', 'superadmin']), blockedDateController.deleteBlockedDate);

// Check date availability (Public API)
router.post('/check-availability', blockedDateController.checkDateAvailability);

module.exports = router;
