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

    // Update retargeting notification status
    try {
      const RetargetingNotificationService = require('../utils/retargetingNotificationService');
      await RetargetingNotificationService.updatePurchaseStatus(userid, carid, 'bookNowToken');
    } catch (retargetingError) {
      logger(`Error updating retargeting status for book now token purchase: ${retargetingError.message}`);
      // Don't fail the request if retargeting update fails
    }

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

// Request book now token cancellation (User can request cancellation for their own tokens)
const requestBookNowTokenCancellation = async (req, res) => {
  try {
    const { reason } = req.body;
    const tokenId = req.params.id;
    
    const bookNowToken = await BookNowToken.findById(tokenId).populate('userid carid');
    if (!bookNowToken) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Book now token not found'
      });
    }
    
    // Check if user owns this token
    if (req.user.role === 'user' && bookNowToken.userid._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to cancel this book now token'
      });
    }
    
    // Check if token can be cancelled
    if (bookNowToken.status !== 'active') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Book now token cannot be cancelled. Only active tokens can be cancelled.'
      });
    }
    
    // Update token status to refund_requested
    bookNowToken.status = 'refund_requested';
    bookNowToken.refundDetails.refundReason = reason || 'User requested cancellation';
    bookNowToken.refundDetails.refundStatus = 'none';
    await bookNowToken.save();
    
    // Send notifications to admins and superadmins
    try {
      await NotificationService.createAdminNotification(
        'booknow_token_refund_requested',
        'Book Now Token Refund Requested',
        `User ${bookNowToken.userid.name} (${bookNowToken.userid.email}) has requested cancellation for book now token ${bookNowToken.customtokenid}. Reason: ${reason || 'No reason provided'}`,
        {
          tokenId: bookNowToken._id,
          userId: bookNowToken.userid._id,
          userName: bookNowToken.userid.name,
          userEmail: bookNowToken.userid.email,
          tokenCustomId: bookNowToken.customtokenid,
          amountPaid: bookNowToken.amountpaid,
          reason: reason || 'No reason provided'
        },
        bookNowToken._id,
        'BookNowToken'
      );
      
      // Send notification to user
      await NotificationService.createUserNotification(
        bookNowToken.userid._id,
        'booknow_token_refund_requested',
        'Book Now Token Cancellation Requested',
        `Your cancellation request for book now token ${bookNowToken.customtokenid} has been submitted. Our team will review it and process your refund within 1-2 business days.`,
        {
          tokenId: bookNowToken._id,
          tokenCustomId: bookNowToken.customtokenid,
          amountPaid: bookNowToken.amountpaid,
          reason: reason || 'No reason provided',
          status: 'refund_requested'
        },
        bookNowToken._id,
        'BookNowToken'
      );
      
      logger(`Book now token cancellation request created for token ${bookNowToken._id} by user ${req.user.id}`);
    } catch (notificationError) {
      logger(`Error creating notification for book now token cancellation: ${notificationError.message}`);
    }
    
    res.json({
      status: 'success',
      body: { bookNowToken },
      message: 'Book now token cancellation request submitted successfully'
    });
  } catch (error) {
    logger(`Error in requestBookNowTokenCancellation: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Approve book now token refund request (Admin/SuperAdmin only)
const approveBookNowTokenRefund = async (req, res) => {
  try {
    const tokenId = req.params.id;
    
    const bookNowToken = await BookNowToken.findById(tokenId).populate('userid carid');
    if (!bookNowToken) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Book now token not found'
      });
    }
    
    // Only admin/superadmin can approve refunds
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to approve refunds'
      });
    }
    
    // Check if token is in refund_requested status
    if (bookNowToken.status !== 'refund_requested') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Book now token is not in refund requested status'
      });
    }
    
    // Update token status to refund_initiated
    bookNowToken.status = 'refund_initiated';
    bookNowToken.refundDetails.refundStatus = 'initiated';
    bookNowToken.refundDetails.refundInitiatedAt = new Date();
    bookNowToken.refundDetails.refundedBy = req.user.id;
    await bookNowToken.save();
    
    // Send notifications to admins and superadmins
    try {
      await NotificationService.createAdminNotification(
        'booknow_token_refund_approved',
        'Book Now Token Refund Approved',
        `Book now token ${bookNowToken.customtokenid} refund has been approved by ${req.user.role}. Ready for refund processing.`,
        {
          tokenId: bookNowToken._id,
          userId: bookNowToken.userid._id,
          userName: bookNowToken.userid.name,
          userEmail: bookNowToken.userid.email,
          tokenCustomId: bookNowToken.customtokenid,
          amountPaid: bookNowToken.amountpaid,
          approvedBy: req.user.name || req.user.email
        },
        bookNowToken._id,
        'BookNowToken'
      );
      
      // Send notification to user
      await NotificationService.createUserNotification(
        bookNowToken.userid._id,
        'booknow_token_refund_approved',
        'Book Now Token Refund Approved',
        `Your refund request for book now token ${bookNowToken.customtokenid} has been approved. The refund process has been initiated and you will receive the amount within 5-7 business days.`,
        {
          tokenId: bookNowToken._id,
          tokenCustomId: bookNowToken.customtokenid,
          amountPaid: bookNowToken.amountpaid,
          status: 'refund_initiated',
          approvedBy: req.user.name || req.user.email
        },
        bookNowToken._id,
        'BookNowToken'
      );
      
      logger(`Book now token refund approved for token ${bookNowToken._id} by ${req.user.role} ${req.user.id}`);
    } catch (notificationError) {
      logger(`Error creating notification for book now token refund approval: ${notificationError.message}`);
    }
    
    res.json({
      status: 'success',
      body: { bookNowToken },
      message: 'Book now token refund approved successfully'
    });
  } catch (error) {
    logger(`Error in approveBookNowTokenRefund: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Reject book now token refund request (Admin/SuperAdmin only)
const rejectBookNowTokenRefund = async (req, res) => {
  try {
    const { reason } = req.body;
    const tokenId = req.params.id;
    
    const bookNowToken = await BookNowToken.findById(tokenId).populate('userid carid');
    if (!bookNowToken) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Book now token not found'
      });
    }
    
    // Only admin/superadmin can reject refunds
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to reject refunds'
      });
    }
    
    // Check if token is in refund_requested status
    if (bookNowToken.status !== 'refund_requested') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Book now token is not in refund requested status'
      });
    }
    
    // Update token status back to active
    bookNowToken.status = 'active';
    bookNowToken.refundDetails.refundReason = reason || 'Refund request rejected';
    await bookNowToken.save();
    
    // Send notifications to admins and superadmins
    try {
      await NotificationService.createAdminNotification(
        'booknow_token_refund_rejected',
        'Book Now Token Refund Rejected',
        `Book now token ${bookNowToken.customtokenid} refund has been rejected by ${req.user.role}. Reason: ${reason || 'No reason provided'}`,
        {
          tokenId: bookNowToken._id,
          userId: bookNowToken.userid._id,
          userName: bookNowToken.userid.name,
          userEmail: bookNowToken.userid.email,
          tokenCustomId: bookNowToken.customtokenid,
          amountPaid: bookNowToken.amountpaid,
          rejectedBy: req.user.name || req.user.email,
          rejectionReason: reason || 'No reason provided'
        },
        bookNowToken._id,
        'BookNowToken'
      );
      
      // Send notification to user
      await NotificationService.createUserNotification(
        bookNowToken.userid._id,
        'booknow_token_refund_rejected',
        'Book Now Token Refund Rejected',
        `Your refund request for book now token ${bookNowToken.customtokenid} has been rejected. Reason: ${reason || 'No reason provided'}. Please contact support if you have any questions.`,
        {
          tokenId: bookNowToken._id,
          tokenCustomId: bookNowToken.customtokenid,
          amountPaid: bookNowToken.amountpaid,
          status: 'active',
          rejectedBy: req.user.name || req.user.email,
          rejectionReason: reason || 'No reason provided'
        },
        bookNowToken._id,
        'BookNowToken'
      );
      
      logger(`Book now token refund rejected for token ${bookNowToken._id} by ${req.user.role} ${req.user.id}`);
    } catch (notificationError) {
      logger(`Error creating notification for book now token refund rejection: ${notificationError.message}`);
    }
    
    res.json({
      status: 'success',
      body: { bookNowToken },
      message: 'Book now token refund rejected successfully'
    });
  } catch (error) {
    logger(`Error in rejectBookNowTokenRefund: ${error.message}`);
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
  deleteBookNowToken,
  requestBookNowTokenCancellation,
  approveBookNowTokenRefund,
  rejectBookNowTokenRefund
};