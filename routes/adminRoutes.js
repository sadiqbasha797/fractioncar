const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// All admin management routes require superadmin role
router.use(authMiddleware(['superadmin']));

// Admin CRUD routes
router.get('/', adminController.getAllAdmins);
router.get('/:id', adminController.getAdminById);
router.get('/:adminId/activities', adminController.getAdminActivities);
router.post('/', adminController.createAdmin);
router.put('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin);
router.put('/:id/password', adminController.updateAdminPassword);

module.exports = router;
