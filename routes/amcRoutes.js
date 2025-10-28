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

// Penalty management routes (admin and superadmin only)
router.get('/overdue/list', amcController.getOverdueAMCs);
router.post('/penalties/apply', amcController.applyPenalties);
router.post('/:amcId/penalty/apply', amcController.applyPenaltyForAMC);

// Automatic AMC generation routes (admin and superadmin only)
router.post('/generate-automatic', amcController.generateAutomaticAMC);
router.post('/calculate-penalties', amcController.calculatePenalties);

module.exports = router;