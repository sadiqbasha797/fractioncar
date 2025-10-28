const Booking = require('../models/booking');
const User = require('../models/User');
const Car = require('../models/Car');
const BlockedDate = require('../models/BlockedDate');
const logger = require('../utils/logger');
const { 
  sendBookingConfirmationEmail, 
  sendSuperAdminBookingNotification 
} = require('../utils/emailService');
const NotificationService = require('../utils/notificationService');

// Create a new booking (User/Admin/SuperAdmin)
const createBooking = async (req, res) => {
  try {
    const { carid, bookingFrom, bookingTo, comments, userid, status } = req.body;

    // Determine the user ID for the booking
    let bookingUserId;
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      // Admin/SuperAdmin can create bookings for any user
      bookingUserId = userid || req.user.id;
    } else {
      // Regular users can only create bookings for themselves
      bookingUserId = req.user.id;
    }

    // Check for existing bookings on the selected dates
    const existingBookings = await Booking.find({
      carid: carid,
      status: 'accepted', // Only check accepted bookings
      $or: [
        {
          bookingFrom: { $lte: new Date(bookingTo) },
          bookingTo: { $gte: new Date(bookingFrom) }
        }
      ]
    });

    // If there are existing bookings, return error
    if (existingBookings.length > 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No vacancy available on the selected dates. Please choose different dates.'
      });
    }

    // Check for blocked dates
    const blockedDates = await BlockedDate.find({
      carid: carid,
      isActive: true,
      $or: [
        {
          blockedFrom: { $lte: new Date(bookingTo) },
          blockedTo: { $gte: new Date(bookingFrom) }
        }
      ]
    });

    // If there are blocked dates, return error
    if (blockedDates.length > 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Bookings are not available on the selected dates due to maintenance or other restrictions.'
      });
    }

    const booking = new Booking({
      carid,
      userid: bookingUserId,
      bookingFrom,
      bookingTo,
      comments,
      status: status || 'accepted' // Default to accepted for admin/superadmin created bookings
    });

    await booking.save();

    // Update retargeting notification status
    try {
      const RetargetingNotificationService = require('../utils/retargetingNotificationService');
      await RetargetingNotificationService.updatePurchaseStatus(req.user.id, carid, 'booking');
    } catch (retargetingError) {
      logger(`Error updating retargeting status for booking: ${retargetingError.message}`);
      // Don't fail the request if retargeting update fails
    }

    // Send emails and create notifications after successful booking creation
    try {
      // Get user and car details for email
      const user = await User.findById(req.user.id);
      const car = await Car.findById(carid);
      
      if (user && car) {
        // Send confirmation email to user
        await sendBookingConfirmationEmail(user, booking, car);
        
        // Send notification email to superadmin
        await sendSuperAdminBookingNotification(user, booking, car);
        
        // Create notifications
        await NotificationService.createBookingNotification(user._id, booking, car);
        await NotificationService.createUserMadeBookingNotification(user, booking, car);
        
        logger(`Emails and notifications sent successfully for booking creation: ${booking._id}`);
      }
    } catch (emailError) {
      // Log email error but don't fail the booking creation
      logger(`Error sending emails/notifications for booking creation: ${emailError.message}`);
    }

    res.status(201).json({
      status: 'success',
      body: { booking },
      message: 'Booking created successfully'
    });
  } catch (error) {
    logger(`Error in createBooking: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all bookings (User: own bookings, Admin/SuperAdmin: all bookings)
const getBookings = async (req, res) => {
  try {
    let filter = {};
    
    // If user, only show their own bookings
    if (req.user.role === 'user') {
      filter.userid = req.user.id;
    }
    
    const bookings = await Booking.find(filter)
      .populate('carid userid')
      .sort({ createdAt: -1 });
      
    res.json({
      status: 'success',
      body: { bookings },
      message: 'Bookings retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getBookings: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get a booking by ID
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('carid userid');
      
    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Booking not found'
      });
    }
    
    // If user, check if they own this booking
    if (req.user.role === 'user' && booking.userid.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to access this booking'
      });
    }
    
    res.json({
      status: 'success',
      body: { booking },
      message: 'Booking retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getBookingById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update booking (Admin/SuperAdmin)
const updateBooking = async (req, res) => {
  try {
    const { carid, bookingFrom, bookingTo, comments, status } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Booking not found'
      });
    }
    
    // Only admin/superadmin can update bookings
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update booking'
      });
    }
    
    // Check for existing bookings on the selected dates (excluding current booking)
    if (carid && bookingFrom && bookingTo) {
      const existingBookings = await Booking.find({
        _id: { $ne: req.params.id },
        carid: carid,
        status: 'accepted',
        $or: [
          {
            bookingFrom: { $lte: new Date(bookingTo) },
            bookingTo: { $gte: new Date(bookingFrom) }
          }
        ]
      });

      if (existingBookings.length > 0) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'No vacancy available on the selected dates. Please choose different dates.'
        });
      }

      // Check for blocked dates
      const blockedDates = await BlockedDate.find({
        carid: carid,
        isActive: true,
        $or: [
          {
            blockedFrom: { $lte: new Date(bookingTo) },
            blockedTo: { $gte: new Date(bookingFrom) }
          }
        ]
      });

      if (blockedDates.length > 0) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Bookings are not available on the selected dates due to maintenance or other restrictions.'
        });
      }
    }
    
    // Update booking fields
    if (carid) booking.carid = carid;
    if (bookingFrom) booking.bookingFrom = bookingFrom;
    if (bookingTo) booking.bookingTo = bookingTo;
    if (comments !== undefined) booking.comments = comments;
    if (status) {
      booking.status = status;
      booking.acceptedby = req.user.id;
      booking.acceptedByModel = req.user.role === 'superadmin' ? 'SuperAdmin' : 'Admin';
    }
    
    await booking.save();
    
    const updatedBooking = await Booking.findById(req.params.id)
      .populate('carid userid');
    
    res.json({
      status: 'success',
      body: { booking: updatedBooking },
      message: 'Booking updated successfully'
    });
  } catch (error) {
    logger(`Error in updateBooking: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update booking status (Admin/SuperAdmin)
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Booking not found'
      });
    }
    
    // Only admin/superadmin can update booking status
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update booking status'
      });
    }
    
    booking.status = status;
    booking.acceptedby = req.user.id;
    booking.acceptedByModel = req.user.role === 'superadmin' ? 'SuperAdmin' : 'Admin';
    
    await booking.save();
    
    const updatedBooking = await Booking.findById(req.params.id)
      .populate('carid userid');
    
    // Send email notification when booking status is updated
    try {
      const user = updatedBooking.userid;
      const car = updatedBooking.carid;
      
      if (user && car) {
        // Send updated booking confirmation to user
        await sendBookingConfirmationEmail(user, updatedBooking, car);
        
        logger(`Booking status update email sent for booking: ${updatedBooking._id}`);
      }
    } catch (emailError) {
      // Log email error but don't fail the status update
      logger(`Error sending email for booking status update: ${emailError.message}`);
    }
      
    res.json({
      status: 'success',
      body: { booking: updatedBooking },
      message: `Booking ${status} successfully`
    });
  } catch (error) {
    logger(`Error in updateBookingStatus: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete a booking (User: own bookings, Admin/SuperAdmin: all bookings)
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Booking not found'
      });
    }
    
    // Users can only delete their own bookings, admin/superadmin can delete any
    if (req.user.role === 'user' && booking.userid.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to delete this booking'
      });
    }
    
    await Booking.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      body: {},
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteBooking: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all bookings for a specific car (Public API for availability checking)
const getCarBookings = async (req, res) => {
  try {
    const { carId } = req.params;
    
    // Get all accepted bookings for the specific car
    const bookings = await Booking.find({ 
      carid: carId,
      status: 'accepted' // Only show accepted bookings
    })
      .populate('userid', 'name email')
      .sort({ bookingFrom: 1 });
    
    res.json({
      status: 'success',
      body: { bookings },
      message: 'Car bookings retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getCarBookings: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Check booking availability for a specific car and date range
const checkBookingAvailability = async (req, res) => {
  try {
    const { carId, bookingFrom, bookingTo } = req.body;
    
    // Check for overlapping bookings
    const overlappingBookings = await Booking.find({
      carid: carId,
      status: 'accepted',
      $or: [
        {
          bookingFrom: { $lte: new Date(bookingTo) },
          bookingTo: { $gte: new Date(bookingFrom) }
        }
      ]
    });

    // Check for blocked dates
    const blockedDates = await BlockedDate.find({
      carid: carId,
      isActive: true,
      $or: [
        {
          blockedFrom: { $lte: new Date(bookingTo) },
          blockedTo: { $gte: new Date(bookingFrom) }
        }
      ]
    });
    
    const isAvailable = overlappingBookings.length === 0 && blockedDates.length === 0;
    
    res.json({
      status: 'success',
      body: { 
        isAvailable,
        conflictingBookings: overlappingBookings,
        conflictingBlockedDates: blockedDates
      },
      message: isAvailable ? 'Date range is available' : 'Date range conflicts with existing bookings or blocked dates'
    });
  } catch (error) {
    logger(`Error in checkBookingAvailability: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  getCarBookings,
  checkBookingAvailability
};