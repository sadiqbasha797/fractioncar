const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route to get all FAQs without authentication
router.get('/public', faqController.getPublicFaqs);

// All routes below this line require admin or superadmin authentication
router.use(authMiddleware(['admin', 'superadmin']));

// Create a new FAQ
router.post('/', faqController.createFaq);

// Get all FAQs
router.get('/', faqController.getFaqs);

// Get a FAQ by ID
router.get('/:id', faqController.getFaqById);

// Update a FAQ by ID
router.put('/:id', faqController.updateFaq);

// Delete a FAQ by ID
router.delete('/:id', faqController.deleteFaq);

module.exports = router;