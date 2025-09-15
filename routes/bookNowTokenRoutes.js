const express = require('express');
const router = express.Router();
const bookNowTokenController = require('../controllers/bookNowTokenController');
const authMiddleware = require('../middleware/authMiddleware');

// Create book now token (User, Admin)
router.post('/', authMiddleware(['user', 'admin', 'user']), bookNowTokenController.createBookNowToken);

// Get book now tokens (User: own tokens, Admin: all tokens)
router.get('/', authMiddleware(['user', 'admin']), bookNowTokenController.getBookNowTokens);

// Get book now token by ID (User: own tokens, Admin: all tokens)
router.get('/:id', authMiddleware(['user', 'admin']), bookNowTokenController.getBookNowTokenById);

// Update book now token (Admin only)
router.put('/:id', authMiddleware(['admin', 'superadmin']), bookNowTokenController.updateBookNowToken);

// Delete book now token (Admin/SuperAdmin only)
router.delete('/:id', authMiddleware(['admin', 'superadmin']), bookNowTokenController.deleteBookNowToken);

module.exports = router;
