const express = require('express');
const router = express.Router();
const faqCategoryController = require('../controllers/faqCategoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route to get active FAQ categories
router.get('/public', faqCategoryController.getFaqCategories);

// All routes below this line require admin or superadmin authentication
router.use(authMiddleware(['admin', 'superadmin']));

// Create a new FAQ Category
router.post('/', faqCategoryController.createFaqCategory);

// Get all FAQ Categories (including inactive)
router.get('/', faqCategoryController.getAllFaqCategories);

// Get FAQ Category by ID
router.get('/:id', faqCategoryController.getFaqCategoryById);

// Update FAQ Category by ID
router.put('/:id', faqCategoryController.updateFaqCategory);

// Soft delete FAQ Category by ID (set isActive to false)
router.delete('/:id', faqCategoryController.deleteFaqCategory);

// Hard delete FAQ Category by ID (permanent deletion)
router.delete('/:id/hard', faqCategoryController.hardDeleteFaqCategory);

module.exports = router;
