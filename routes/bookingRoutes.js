const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

// Create booking (User)
router.post('/', authMiddleware(['user']), bookingController.createBooking);

// Get bookings (User: own bookings, Admin/SuperAdmin: all bookings)
router.get('/', authMiddleware(['user', 'admin', 'superadmin']), bookingController.getBookings);

// Get booking by ID (User: own bookings, Admin/SuperAdmin: all bookings)
router.get('/:id', authMiddleware(['user', 'admin', 'superadmin']), bookingController.getBookingById);

// Update booking status (Admin/SuperAdmin only)
router.put('/:id/status', authMiddleware(['admin', 'superadmin']), bookingController.updateBookingStatus);

// Delete booking (User: own bookings, Admin/SuperAdmin: all bookings)
router.delete('/:id', authMiddleware(['user', 'admin', 'superadmin']), bookingController.deleteBooking);

// Public routes for availability checking
// Get all bookings for a specific car (Public API)
router.get('/car/:carId', bookingController.getCarBookings);

// Check booking availability for a specific car and date range (Public API)
router.post('/check-availability', bookingController.checkBookingAvailability);

module.exports = router;