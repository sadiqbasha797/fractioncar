const express = require('express');
const router = express.Router();
const amcController = require('../controllers/amcController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes for user (create, get all, get by ID, update, delete)
router.use(authMiddleware(['user', 'admin', 'superadmin']));
router.post('/', amcController.createAMC);
router.get('/', amcController.getAMCs);
router.get('/:id', amcController.getAMCById);
router.put('/:id', amcController.updateAMC);
router.delete('/:id', amcController.deleteAMC);

// Special route for updating payment status
router.put('/:id/payment-status', amcController.updateAMCPaymentStatus);

module.exports = router;