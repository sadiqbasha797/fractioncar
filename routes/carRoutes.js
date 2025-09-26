const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');

// Public route to get all cars without authentication
router.get('/public', carController.getPublicCars);

// Public route to get most browsed cars (must be before /public/:id)
router.get('/public/most-browsed', carController.getMostBrowsedCars);

// Public route to get a car by ID without authentication
router.get('/public/:id', carController.getPublicCarById);

// Public route to update bookNowTokenAvailable count (for payment updates)
router.put('/public/:id/book-now-token-count', carController.updateBookNowTokenCount);

// Public route to track car view (for anonymous users)
router.post('/public/:id/view', carController.trackCarView);

// User route to track car view (for authenticated users - includes retargeting)
router.post('/:id/view', authMiddleware(['user']), carController.trackCarView);

// All routes below this line require admin or superadmin authentication
router.use(authMiddleware(['admin', 'superadmin']));

// Create a new car
router.post('/', upload.array('images', 10), carController.createCar);

// Get all cars
router.get('/', carController.getCars);

// Get cars with stopBookings filter
router.get('/filter', carController.getCarsWithStopBookingsFilter);

// Get a car by ID
router.get('/:id', carController.getCarById);

// Update a car by ID
router.put('/:id', upload.array('images', 10), carController.updateCar);


// Delete a car by ID
router.delete('/:id', carController.deleteCar);

module.exports = router;