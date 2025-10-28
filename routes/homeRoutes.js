const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');
const videoUpload = require('../config/videoMulter');

// ==================== PUBLIC ROUTES ====================

// Public routes for Hero Content
router.get('/hero-content/public', homeController.getPublicHeroContent);

// Public routes for Brands
router.get('/brands/public', homeController.getPublicBrands);

// Public routes for Simple Steps
router.get('/simple-steps/public', homeController.getPublicSimpleSteps);

// Public routes for Absolutely Public Simple Steps Videos
router.get('/simple-steps-videos/absolutely-public', authMiddleware([], true), homeController.getAbsolutelyPublicSimpleStepsVideos);

// Public routes for Simple Steps Section - removed

// Public routes for FAQs
router.get('/faqs/public', homeController.getPublicFaqs);

// Public routes for Featured Cars
router.get('/featured-cars/public', homeController.getPublicFeaturedCars);

// ==================== PROTECTED ROUTES (Admin/SuperAdmin) ====================

// All routes below this line require admin or superadmin authentication
router.use(authMiddleware(['admin', 'superadmin']));

// ==================== HERO CONTENT ROUTES ====================

// Create a new Hero Content
router.post('/hero-content', upload.fields([{ name: 'bgImage1', maxCount: 1 }, { name: 'bgImage2', maxCount: 1 }, { name: 'bgImage3', maxCount: 1 }]), homeController.createHeroContent);

// Get all Hero Content
router.get('/hero-content', homeController.getHeroContent);

// Get Hero Content by ID
router.get('/hero-content/:id', homeController.getHeroContentById);

// Update Hero Content by ID
router.put('/hero-content/:id', upload.fields([{ name: 'bgImage1', maxCount: 1 }, { name: 'bgImage2', maxCount: 1 }, { name: 'bgImage3', maxCount: 1 }]), homeController.updateHeroContent);

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

// Create a new Simple Step (without video fields now)
router.post('/simple-steps', homeController.createSimpleStep);

// Get all Simple Steps
router.get('/simple-steps', homeController.getSimpleSteps);

// Get Simple Step by ID
router.get('/simple-steps/:id', homeController.getSimpleStepById);

// Update Simple Step by ID
router.put('/simple-steps/:id', homeController.updateSimpleStep);

// Delete Simple Step by ID
router.delete('/simple-steps/:id', homeController.deleteSimpleStep);

// ==================== SIMPLE STEPS VIDEO ROUTES ====================

// Create a new Simple Steps Video
router.post('/simple-steps-videos', videoUpload.fields([{ name: 'video1', maxCount: 1 }, { name: 'video2', maxCount: 1 }]), homeController.createSimpleStepsVideo);

// Get all Simple Steps Videos
router.get('/simple-steps-videos', homeController.getSimpleStepsVideos);

// Get Simple Steps Video by ID
router.get('/simple-steps-videos/:id', homeController.getSimpleStepsVideoById);

// Update Simple Steps Video by ID
router.put('/simple-steps-videos/:id', videoUpload.fields([{ name: 'video1', maxCount: 1 }, { name: 'video2', maxCount: 1 }]), homeController.updateSimpleStepsVideo);

// Delete Simple Steps Video by ID
router.delete('/simple-steps-videos/:id', homeController.deleteSimpleStepsVideo);

// Simple Steps Section routes removed

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

// ==================== FEATURED CARS ROUTES ====================

// Add a car to featured cars
router.post('/featured-cars', homeController.addFeaturedCar);

// Get all featured cars
router.get('/featured-cars', homeController.getFeaturedCars);

// Remove a car from featured cars
router.delete('/featured-cars/:carId', homeController.removeFeaturedCar);

module.exports = router;