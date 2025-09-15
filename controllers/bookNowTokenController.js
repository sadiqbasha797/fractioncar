const BookNowToken = require('../models/bookNowToken');
const Car = require('../models/Car');
const User = require('../models/User');
const logger = require('../utils/logger');
const { 
  sendBookNowTokenPurchaseConfirmationEmail, 
  sendSuperAdminBookNowTokenPurchaseNotification 
} = require('../utils/emailService');
const NotificationService = require('../utils/notificationService');

// Create a new book now token (Admin/SuperAdmin)
const createBookNowToken = async (req, res) => {
  try {
    const { carid, customtokenid, userid, amountpaid, expirydate, status } = req.body;

    // Check if there are available book now tokens for this car
    const car = await Car.findById(carid);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }
    
    if (car.bookNowTokenAvailable <= 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No available book now tokens for this car'
      });
    }

    const bookNowToken = new BookNowToken({
      carid,
      customtokenid,
      userid,
      amountpaid,
      expirydate,
      status
    });

    await bookNowToken.save();

    // Decrement bookNowTokenAvailable in the car document
    await Car.findByIdAndUpdate(carid, {
      $inc: { bookNowTokenAvailable: -1 }
    });

    // Send emails and create notifications after successful book now token creation
    try {
      // Get user and car details for email
      const user = await User.findById(userid);
      const car = await Car.findById(carid);
      
      if (user && car) {
        // Send confirmation email to user
        await sendBookNowTokenPurchaseConfirmationEmail(user, bookNowToken, car);
        
        // Send notification email to superadmin
        await sendSuperAdminBookNowTokenPurchaseNotification(user, bookNowToken, car);
        
        // Create notifications
        await NotificationService.createBookNowTokenNotification(user._id, bookNowToken, car);
        await NotificationService.createUserPurchasedBookNowTokenNotification(user, bookNowToken, car);
        
        logger(`Emails and notifications sent successfully for book now token creation: ${bookNowToken._id}`);
      }
    } catch (emailError) {
      // Log email error but don't fail the token creation
      logger(`Error sending emails/notifications for book now token creation: ${emailError.message}`);
    }

    res.status(201).json({
      status: 'success',
      body: { bookNowToken },
      message: 'Book now token created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Book now token with this custom ID already exists'
      });
    }
    logger(`Error in createBookNowToken: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all book now tokens (Admin/SuperAdmin: all tokens, User: own tokens)
const getBookNowTokens = async (req, res) => {
  try {
    let filter = {};
    
    // If user, only show their own tokens
    if (req.user.role === 'user') {
      filter.userid = req.user.id;
    }
    
    const bookNowTokens = await BookNowToken.find(filter)
      .populate('carid userid')
      .sort({ createdAt: -1 });
      
    res.json({
      status: 'success',
      body: { bookNowTokens },
      message: 'Book now tokens retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getBookNowTokens: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get a book now token by ID (Admin/SuperAdmin: any token, User: own tokens)
const getBookNowTokenById = async (req, res) => {
  try {
    const bookNowToken = await BookNowToken.findById(req.params.id)
      .populate('carid userid');
      
    if (!bookNowToken) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Book now token not found'
      });
    }
    
    // If user, check if they own this token
    if (req.user.role === 'user' && bookNowToken.userid.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to access this book now token'
      });
    }
    
    res.json({
      status: 'success',
      body: { bookNowToken },
      message: 'Book now token retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getBookNowTokenById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update a book now token by ID (Admin/SuperAdmin)
const updateBookNowToken = async (req, res) => {
  try {
    const { carid, customtokenid, userid, amountpaid, expirydate, status } = req.body;
    
    const bookNowToken = await BookNowToken.findById(req.params.id);
    if (!bookNowToken) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Book now token not found'
      });
    }
    
    // Only admin/superadmin can update tokens
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this book now token'
      });
    }
    
    const updatedBookNowToken = await BookNowToken.findByIdAndUpdate(
      req.params.id,
      { carid, customtokenid, userid, amountpaid, expirydate, status },
      { new: true, runValidators: true }
    ).populate('carid userid');
    
    // If token status is updated to "dropped", increment bookNowTokenAvailable in the car document
    if (status === 'dropped' && bookNowToken.status !== 'dropped') {
      const car = await Car.findById(carid);
      if (car && car.bookNowTokenAvailable < 12) {
        await Car.findByIdAndUpdate(carid, {
          $inc: { bookNowTokenAvailable: 1 }
        });
      }
    }
    
    res.json({
      status: 'success',
      body: { bookNowToken: updatedBookNowToken },
      message: 'Book now token updated successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Book now token with this custom ID already exists'
      });
    }
    logger(`Error in updateBookNowToken: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete a book now token by ID (Admin/SuperAdmin)
const deleteBookNowToken = async (req, res) => {
  try {
    const bookNowToken = await BookNowToken.findById(req.params.id);
    if (!bookNowToken) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Book now token not found'
      });
    }
    
    // Only admin/superadmin can delete tokens
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to delete this book now token'
      });
    }
    
    await BookNowToken.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      body: {},
      message: 'Book now token deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteBookNowToken: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createBookNowToken,
  getBookNowTokens,
  getBookNowTokenById,
  updateBookNowToken,
  deleteBookNowToken
};