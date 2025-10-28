const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const authMiddleware = require('../middleware/authMiddleware');

// Admin/SuperAdmin routes - specific routes first
router.post('/', 
  authMiddleware(['admin', 'superadmin']), 
  contractController.uploadMultiple, 
  contractController.createContract
);
router.get('/admin', authMiddleware(['admin', 'superadmin']), contractController.getContracts);
router.get('/admin/:id', authMiddleware(['admin', 'superadmin']), contractController.getContractById);

// Check contract references (Admin/SuperAdmin)
router.get('/check-references', authMiddleware(['admin', 'superadmin']), contractController.checkAndFixContractReferences);

// Upload contract documents (Admin/SuperAdmin) - specific route before generic :id routes
router.post('/upload/:contractId', 
  authMiddleware(['admin', 'superadmin']), 
  contractController.uploadMultiple, 
  contractController.uploadContractDocuments
);

// Delete contract documents (Admin/SuperAdmin)
router.delete('/docs/:contractId', 
  authMiddleware(['admin', 'superadmin']), 
  contractController.deleteContractDocs
);

// Update contract documents (Admin/SuperAdmin) - replaces existing documents
router.put('/docs/:contractId', 
  authMiddleware(['admin', 'superadmin']), 
  contractController.uploadMultiple, 
  contractController.updateContractDocs
);

// Generic admin routes - these should come after specific routes
router.put('/:id', authMiddleware(['admin', 'superadmin']), contractController.updateContract);
router.delete('/:id', authMiddleware(['admin', 'superadmin']), contractController.deleteContract);

// User routes
router.get('/my-contracts', authMiddleware(['user']), contractController.getUserContractDocuments);
router.get('/download/:contractId/:docIndex', authMiddleware(['user', 'admin', 'superadmin']), contractController.downloadContractDocument);

// Test route for contract document URL (for testing purposes)
router.get('/document-url/:contractId/:docIndex', authMiddleware(['user', 'admin', 'superadmin']), contractController.getContractDocumentUrl);

module.exports = router;