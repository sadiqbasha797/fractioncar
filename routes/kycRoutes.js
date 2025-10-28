const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kycController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadKycDocument = require('../config/kycMulter');

// User routes
router.post('/upload-document', authMiddleware(['user']), uploadKycDocument.single('document'), kycController.uploadKycDocument);
router.post('/submit', authMiddleware(['user']), kycController.submitKyc);
router.get('/my-status', authMiddleware(['user']), kycController.getMyKycStatus);

// Admin/SuperAdmin routes
router.get('/requests', authMiddleware(['admin', 'superadmin']), kycController.getAllKycRequests);
router.get('/details/:userId', authMiddleware(['admin', 'superadmin']), kycController.getKycDetails);
router.put('/approve/:userId', authMiddleware(['admin', 'superadmin']), kycController.approveKyc);
router.put('/reject/:userId', authMiddleware(['admin', 'superadmin']), kycController.rejectKyc);

module.exports = router;