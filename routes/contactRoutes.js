const express = require('express');
const router = express.Router();
const {
  submitContactForm,
  getAllContactForms,
  getContactFormById,
  updateContactFormStatus,
  deleteContactForm,
  getContactFormStats
} = require('../controllers/contactController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/submit', submitContactForm);

// Admin routes (require authentication and admin role)
router.get('/admin/all', authMiddleware(['admin', 'superadmin']), getAllContactForms);
router.get('/admin/stats', authMiddleware(['admin', 'superadmin']), getContactFormStats);
router.get('/admin/:id', authMiddleware(['admin', 'superadmin']), getContactFormById);
router.put('/admin/:id/status', authMiddleware(['admin', 'superadmin']), updateContactFormStatus);
router.delete('/admin/:id', authMiddleware(['admin', 'superadmin']), deleteContactForm);

module.exports = router;
