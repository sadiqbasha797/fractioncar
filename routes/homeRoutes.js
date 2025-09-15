const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');

// ==================== PUBLIC ROUTES ====================

// Public routes for Hero Content
router.get('/hero-content/public', homeController.getPublicHeroContent);

// Public routes for Brands
router.get('/brands/public', homeController.getPublicBrands);

// Public routes for Simple Steps
router.get('/simple-steps/public', homeController.getPublicSimpleSteps);

// Public routes for FAQs
router.get('/faqs/public', homeController.getPublicFaqs);

// ==================== PROTECTED ROUTES (Admin/SuperAdmin) ====================

// All routes below this line require admin or superadmin authentication
router.use(authMiddleware(['admin', 'superadmin']));

// ==================== HERO CONTENT ROUTES ====================

// Create a new Hero Content
router.post('/hero-content', upload.single('bgImage'), homeController.createHeroContent);

// Get all Hero Content
router.get('/hero-content', homeController.getHeroContent);

// Get Hero Content by ID
router.get('/hero-content/:id', homeController.getHeroContentById);

// Update Hero Content by ID
router.put('/hero-content/:id', upload.single('bgImage'), homeController.updateHeroContent);

// Delete Hero Content by ID
router.delete('/hero-content/:id', homeController.deleteHeroContent);

// ==================== BRANDS ROUTES ====================

// Create a new Brand
router.post('/brands', upload.single('brandLogo'), homeController.createBrand);

// Get all Brands
router.get('/brands', homeController.getBrands);

// Get Brand by ID
router.get('/brands/:id', homeController.getBrandById);

// Update Brand by ID
router.put('/brands/:id', upload.single('brandLogo'), homeController.updateBrand);

// Delete Brand by ID
router.delete('/brands/:id', homeController.deleteBrand);

// ==================== SIMPLE STEPS ROUTES ====================

// Create a new Simple Step
router.post('/simple-steps', homeController.createSimpleStep);

// Get all Simple Steps
router.get('/simple-steps', homeController.getSimpleSteps);

// Get Simple Step by ID
router.get('/simple-steps/:id', homeController.getSimpleStepById);

// Update Simple Step by ID
router.put('/simple-steps/:id', homeController.updateSimpleStep);

// Delete Simple Step by ID
router.delete('/simple-steps/:id', homeController.deleteSimpleStep);

// ==================== FAQ ROUTES ====================

// Create a new FAQ
router.post('/faqs', homeController.createFaq);

// Get all FAQs
router.get('/faqs', homeController.getFaqs);

// Get FAQ by ID
router.get('/faqs/:id', homeController.getFaqById);

// Update FAQ by ID
router.put('/faqs/:id', homeController.updateFaq);

// Delete FAQ by ID
router.delete('/faqs/:id', homeController.deleteFaq);

module.exports = router;
