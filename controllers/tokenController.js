const Token = require('../models/token');
const Car = require('../models/Car');
const User = require('../models/User');
const logger = require('../utils/logger');
const { 
  sendTokenPurchaseConfirmationEmail, 
  sendSuperAdminTokenPurchaseNotification 
} = require('../utils/emailService');
const NotificationService = require('../utils/notificationService');
const BookingAvailabilityService = require('../utils/bookingAvailabilityService');

// Create a new token (Admin/SuperAdmin can create for any user, User can create for themselves)
const createToken = async (req, res) => {
  try {
    const { 
      carid, 
      customtokenid, 
      amountpaid, 
      expirydate, 
      status,
      paymentTransactionId,
      razorpayOrderId,
      razorpayPaymentId
    } = req.body;
    
    // Determine userid based on role
    let userid;
    if (req.user.role === 'user') {
      // User can only create tokens for themselves
      userid = req.user.id;
    } else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      // Admin/SuperAdmin can create tokens for any user
      userid = req.body.userid;
      if (!userid) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'User ID is required for admin/superadmin token creation'
        });
      }
    } else {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to create tokens'
      });
    }

    // Check if there are available tokens for this car
    const car = await Car.findById(carid);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }
    
    if (car.tokensavailble <= 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No available tokens for this car'
      });
    }

    const tokenData = {
      carid,
      customtokenid,
      userid,
      amountpaid,
      expirydate,
      status
    };

    // Add payment fields only if they are provided
    if (paymentTransactionId) {
      tokenData.paymentTransactionId = paymentTransactionId;
    }
    if (razorpayOrderId) {
      tokenData.razorpayOrderId = razorpayOrderId;
    }
    if (razorpayPaymentId) {
      tokenData.razorpayPaymentId = razorpayPaymentId;
    }

    const token = new Token(tokenData);

    await token.save();

    // Decrement tokensavailble in the car document
    await Car.findByIdAndUpdate(carid, {
      $inc: { tokensavailble: -1 }
    });

    // Update retargeting notification status
    try {
      const RetargetingNotificationService = require('../utils/retargetingNotificationService');
      await RetargetingNotificationService.updatePurchaseStatus(userid, carid, 'token');
    } catch (retargetingError) {
      logger(`Error updating retargeting status for token purchase: ${retargetingError.message}`);
      // Don't fail the request if retargeting update fails
    }

    // Check if bookings should be stopped for this car after token decrement
    try {
      await BookingAvailabilityService.stopBookingsIfNeeded(carid);
    } catch (error) {
      logger(`Error checking booking availability after token creation: ${error.message}`);
      // Don't fail the request if this check fails
    }

    // Send emails and create notifications after successful token creation
    try {
      // Get user and car details for email
      const user = await User.findById(userid);
      const car = await Car.findById(carid);
      
      if (user && car) {
        // Send confirmation email to user
        await sendTokenPurchaseConfirmationEmail(user, token, car);
        
        // Send notification email to superadmin
        await sendSuperAdminTokenPurchaseNotification(user, token, car);
        
        // Create notifications
        await NotificationService.createTokenNotification(user._id, token, car);
        await NotificationService.createUserJoinedWaitlistNotification(user, token, car);
        
        logger(`Emails and notifications sent successfully for token creation: ${token._id}`);
      }
    } catch (emailError) {
      // Log email error but don't fail the token creation
      logger(`Error sending emails/notifications for token creation: ${emailError.message}`);
    }

    res.status(201).json({
      status: 'success',
      body: { token },
      message: 'Token created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Token with this custom ID already exists'
      });
    }
    logger(`Error in createToken: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all tokens (Admin/SuperAdmin: all tokens, User: own tokens)
const getTokens = async (req, res) => {
  try {
    let filter = {};
    
    // If user, only show their own tokens
    if (req.user.role === 'user') {
      filter.userid = req.user.id;
    }
    
    const tokens = await Token.find(filter)
      .populate('carid userid')
      .sort({ createdAt: -1 });
      
    res.json({
      status: 'success',
      body: { tokens },
      message: 'Tokens retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getTokens: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get a token by ID (Admin/SuperAdmin: any token, User: own tokens)
const getTokenById = async (req, res) => {
  try {
    const token = await Token.findById(req.params.id)
      .populate('carid userid');
      
    if (!token) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Token not found'
      });
    }
    
    // If user, check if they own this token
    if (req.user.role === 'user' && token.userid.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to access this token'
      });
    }
    
    res.json({
      status: 'success',
      body: { token },
      message: 'Token retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getTokenById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update a token by ID (User can update own tokens, Admin/SuperAdmin can update any token)
const updateToken = async (req, res) => {
  try {
    const { carid, customtokenid, userid, amountpaid, expirydate, status } = req.body;
    
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Token not found'
      });
    }
    
    // Check authorization
    if (req.user.role === 'user') {
      // User can only update their own tokens
      if (token.userid.toString() !== req.user.id) {
        return res.status(403).json({
          status: 'failed',
          body: {},
          message: 'Not authorized to update this token'
        });
      }
    } else if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update tokens'
      });
    }
    
    const updatedToken = await Token.findByIdAndUpdate(
      req.params.id,
      { carid, customtokenid, userid, amountpaid, expirydate, status },
      { new: true, runValidators: true }
    ).populate('carid userid');
    
    // If token status is updated to "dropped", increment tokensavailble in the car document
    if (status === 'dropped' && token.status !== 'dropped') {
      const car = await Car.findById(carid);
      if (car && car.tokensavailble < 20) {
        await Car.findByIdAndUpdate(carid, {
          $inc: { tokensavailble: 1 }
        });

        // Check if bookings should be enabled for this car after token increment
        try {
          await BookingAvailabilityService.stopBookingsIfNeeded(carid);
        } catch (error) {
          logger(`Error checking booking availability after token drop: ${error.message}`);
          // Don't fail the request if this check fails
        }
      }
    }
    
    res.json({
      status: 'success',
      body: { token: updatedToken },
      message: 'Token updated successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Token with this custom ID already exists'
      });
    }
    logger(`Error in updateToken: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete a token by ID (Admin/SuperAdmin)
const deleteToken = async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Token not found'
      });
    }
    
    // Only admin/superadmin can delete tokens
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to delete this token'
      });
    }
    
    await Token.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      body: {},
      message: 'Token deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteToken: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Request token cancellation (User can request cancellation for their own tokens)
const requestTokenCancellation = async (req, res) => {
  try {
    const { reason } = req.body;
    const tokenId = req.params.id;
    
    const token = await Token.findById(tokenId).populate('userid carid');
    if (!token) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Token not found'
      });
    }
    
    // Check if user owns this token
    if (req.user.role === 'user' && token.userid._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to cancel this token'
      });
    }
    
    // Check if token can be cancelled
    if (token.status !== 'active') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Token cannot be cancelled. Only active tokens can be cancelled.'
      });
    }
    
    // Update token status to refund_requested
    token.status = 'refund_requested';
    token.refundDetails.refundReason = reason || 'User requested cancellation';
    token.refundDetails.refundStatus = 'none';
    await token.save();
    
    // Send notifications to admins and superadmins
    try {
      await NotificationService.createAdminNotification(
        'token_refund_requested',
        'Token Refund Requested',
        `User ${token.userid.name} (${token.userid.email}) has requested cancellation for token ${token.customtokenid}. Reason: ${reason || 'No reason provided'}`,
        {
          tokenId: token._id,
          userId: token.userid._id,
          userName: token.userid.name,
          userEmail: token.userid.email,
          tokenCustomId: token.customtokenid,
          amountPaid: token.amountpaid,
          reason: reason || 'No reason provided'
        },
        token._id,
        'Token'
      );
      
      // Send notification to user
      await NotificationService.createUserNotification(
        token.userid._id,
        'token_refund_requested',
        'Token Cancellation Requested',
        `Your cancellation request for token ${token.customtokenid} has been submitted. Our team will review it and process your refund within 1-2 business days.`,
        {
          tokenId: token._id,
          tokenCustomId: token.customtokenid,
          amountPaid: token.amountpaid,
          reason: reason || 'No reason provided',
          status: 'refund_requested'
        },
        token._id,
        'Token'
      );
      
      logger(`Token cancellation request created for token ${token._id} by user ${req.user.id}`);
    } catch (notificationError) {
      logger(`Error creating notification for token cancellation: ${notificationError.message}`);
    }
    
    res.json({
      status: 'success',
      body: { token },
      message: 'Token cancellation request submitted successfully'
    });
  } catch (error) {
    logger(`Error in requestTokenCancellation: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Approve token refund request (Admin/SuperAdmin only)
const approveTokenRefund = async (req, res) => {
  try {
    const tokenId = req.params.id;
    
    const token = await Token.findById(tokenId).populate('userid carid');
    if (!token) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Token not found'
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
    if (token.status !== 'refund_requested') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Token is not in refund requested status'
      });
    }
    
    // Update token status to refund_initiated
    token.status = 'refund_initiated';
    token.refundDetails.refundStatus = 'initiated';
    token.refundDetails.refundInitiatedAt = new Date();
    token.refundDetails.refundedBy = req.user.id;
    await token.save();
    
    // Send notifications to admins and superadmins
    try {
      await NotificationService.createAdminNotification(
        'token_refund_approved',
        'Token Refund Approved',
        `Token ${token.customtokenid} refund has been approved by ${req.user.role}. Ready for refund processing.`,
        {
          tokenId: token._id,
          userId: token.userid._id,
          userName: token.userid.name,
          userEmail: token.userid.email,
          tokenCustomId: token.customtokenid,
          amountPaid: token.amountpaid,
          approvedBy: req.user.name || req.user.email
        },
        token._id,
        'Token'
      );
      
      // Send notification to user
      await NotificationService.createUserNotification(
        token.userid._id,
        'token_refund_approved',
        'Token Refund Approved',
        `Your refund request for token ${token.customtokenid} has been approved. The refund process has been initiated and you will receive the amount within 5-7 business days.`,
        {
          tokenId: token._id,
          tokenCustomId: token.customtokenid,
          amountPaid: token.amountpaid,
          status: 'refund_initiated',
          approvedBy: req.user.name || req.user.email
        },
        token._id,
        'Token'
      );
      
      logger(`Token refund approved for token ${token._id} by ${req.user.role} ${req.user.id}`);
    } catch (notificationError) {
      logger(`Error creating notification for token refund approval: ${notificationError.message}`);
    }
    
    res.json({
      status: 'success',
      body: { token },
      message: 'Token refund approved successfully'
    });
  } catch (error) {
    logger(`Error in approveTokenRefund: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Reject token refund request (Admin/SuperAdmin only)
const rejectTokenRefund = async (req, res) => {
  try {
    const { reason } = req.body;
    const tokenId = req.params.id;
    
    const token = await Token.findById(tokenId).populate('userid carid');
    if (!token) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Token not found'
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
    if (token.status !== 'refund_requested') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Token is not in refund requested status'
      });
    }
    
    // Update token status back to active
    token.status = 'active';
    token.refundDetails.refundReason = reason || 'Refund request rejected';
    await token.save();
    
    // Send notifications to admins and superadmins
    try {
      await NotificationService.createAdminNotification(
        'token_refund_rejected',
        'Token Refund Rejected',
        `Token ${token.customtokenid} refund has been rejected by ${req.user.role}. Reason: ${reason || 'No reason provided'}`,
        {
          tokenId: token._id,
          userId: token.userid._id,
          userName: token.userid.name,
          userEmail: token.userid.email,
          tokenCustomId: token.customtokenid,
          amountPaid: token.amountpaid,
          rejectedBy: req.user.name || req.user.email,
          rejectionReason: reason || 'No reason provided'
        },
        token._id,
        'Token'
      );
      
      // Send notification to user
      await NotificationService.createUserNotification(
        token.userid._id,
        'token_refund_rejected',
        'Token Refund Rejected',
        `Your refund request for token ${token.customtokenid} has been rejected. Reason: ${reason || 'No reason provided'}. Please contact support if you have any questions.`,
        {
          tokenId: token._id,
          tokenCustomId: token.customtokenid,
          amountPaid: token.amountpaid,
          status: 'active',
          rejectedBy: req.user.name || req.user.email,
          rejectionReason: reason || 'No reason provided'
        },
        token._id,
        'Token'
      );
      
      logger(`Token refund rejected for token ${token._id} by ${req.user.role} ${req.user.id}`);
    } catch (notificationError) {
      logger(`Error creating notification for token refund rejection: ${notificationError.message}`);
    }
    
    res.json({
      status: 'success',
      body: { token },
      message: 'Token refund rejected successfully'
    });
  } catch (error) {
    logger(`Error in rejectTokenRefund: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createToken,
  getTokens,
  getTokenById,
  updateToken,
  deleteToken,
  requestTokenCancellation,
  approveTokenRefund,
  rejectTokenRefund
};