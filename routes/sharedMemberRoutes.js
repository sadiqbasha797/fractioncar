const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const uploadSharedMemberDocument = require('../config/sharedMemberMulter');
const {
  createSharedMember,
  getMySharedMembers,
  getAllSharedMembers,
  getSharedMemberById,
  updateSharedMember,
  deleteSharedMember,
  updateSharedMemberStatus,
  getSharedMemberStats,
  uploadKycDocument,
  updateKycDocument,
  deleteKycDocument
} = require('../controllers/sharedMemberController');

// User routes
router.post('/', authMiddleware(['user', 'admin', 'superadmin']), createSharedMember);
router.get('/my', authMiddleware(['user']), getMySharedMembers);
router.get('/my/:id', authMiddleware(['user']), getSharedMemberById);
router.delete('/my/:id', authMiddleware(['user']), deleteSharedMember);

// Document upload routes (User, Admin, SuperAdmin)
router.post('/:sharedMemberId/documents', authMiddleware(['user', 'admin', 'superadmin']), uploadSharedMemberDocument.single('document'), uploadKycDocument);
router.put('/:sharedMemberId/documents/:documentId', authMiddleware(['user', 'admin', 'superadmin']), uploadSharedMemberDocument.single('document'), updateKycDocument);
router.delete('/:sharedMemberId/documents/:documentId', authMiddleware(['user', 'admin', 'superadmin']), deleteKycDocument);

// Admin and SuperAdmin routes
router.get('/all', authMiddleware(['admin', 'superadmin']), getAllSharedMembers);
router.get('/stats', authMiddleware(['admin', 'superadmin']), getSharedMemberStats);
router.get('/:id', authMiddleware(['user', 'admin', 'superadmin']), getSharedMemberById);
router.put('/:id', authMiddleware(['admin', 'superadmin']), updateSharedMember);
router.put('/:id/status', authMiddleware(['admin', 'superadmin']), updateSharedMemberStatus);
router.delete('/:id', authMiddleware(['admin', 'superadmin']), deleteSharedMember);

module.exports = router;
