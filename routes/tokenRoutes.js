const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const authMiddleware = require('../middleware/authMiddleware');

// Create token (User can create for themselves, Admin/SuperAdmin can create for any user)
router.post('/', authMiddleware(['user', 'admin', 'superadmin']), tokenController.createToken);

// Get tokens (User: own tokens, Admin/SuperAdmin: all tokens)
router.get('/', authMiddleware(['user', 'admin', 'superadmin']), tokenController.getTokens);

// Get token by ID (User: own tokens, Admin/SuperAdmin: all tokens)
router.get('/:id', authMiddleware(['user', 'admin', 'superadmin']), tokenController.getTokenById);

// Update token (User can update own tokens, Admin/SuperAdmin can update any token)
router.put('/:id', authMiddleware(['user', 'admin', 'superadmin']), tokenController.updateToken);

// Delete token (Admin/SuperAdmin only)
router.delete('/:id', authMiddleware(['admin', 'superadmin']), tokenController.deleteToken);

module.exports = router;