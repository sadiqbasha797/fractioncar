require('dotenv').config();
const CarView = require('../models/CarView');
const Car = require('../models/Car');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Token = require('../models/token');
const BookNowToken = require('../models/bookNowToken');
const Booking = require('../models/booking');
const NotificationService = require('./notificationService');
const EmailService = require('./emailService');
const logger = require('./logger');

class RetargetingNotificationService {
  /**
   * Check and send retargeting notifications for users who viewed cars but didn't purchase
   */
  static async checkAndSendRetargetingNotifications() {
    try {
      logger('Starting retargeting notification check...');
      
      // Get users who viewed cars in the last 24 hours but didn't purchase
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Find car views from yesterday that haven't resulted in purchases
      const carViews = await CarView.find({
        viewedAt: { $gte: yesterday, $lte: today },
        hasPurchased: false,
        $or: [
          { notificationsSent: { $lt: 2 } }, // Less than 2 notifications sent
          { notificationsSent: { $exists: false } }
        ]
      }).populate('userId', 'name email').populate('carId', 'carname brandname price fractionprice images');

      logger(`Found ${carViews.length} car views eligible for retargeting notifications`);

      if (carViews.length === 0) {
        return {
          notificationsSent: 0,
          usersNotified: 0,
          carsPromoted: 0
        };
      }

      // Group views by user to prioritize most viewed cars
      const userViews = this.groupViewsByUser(carViews);
      
      let notificationsSent = 0;
      let usersNotified = 0;
      const carsPromoted = new Set();

      // Process each user's views
      for (const [userId, views] of userViews.entries()) {
        try {
          const result = await this.processUserRetargeting(userId, views);
          notificationsSent += result.notificationsSent;
          if (result.notificationsSent > 0) {
            usersNotified++;
            views.forEach(view => carsPromoted.add(view.carId._id.toString()));
          }
        } catch (error) {
          logger(`Error processing retargeting for user ${userId}: ${error.message}`);
        }
      }

      logger(`Retargeting notification check completed. ${notificationsSent} notifications sent to ${usersNotified} users for ${carsPromoted.size} cars.`);

      return {
        notificationsSent,
        usersNotified,
        carsPromoted: carsPromoted.size
      };

    } catch (error) {
      logger(`Error in retargeting notification check: ${error.message}`);
      throw error;
    }
  }

  /**
   * Group car views by user and sort by view count
   */
  static groupViewsByUser(carViews) {
    const userViews = new Map();
    
    carViews.forEach(view => {
      const userId = view.userId._id.toString();
      if (!userViews.has(userId)) {
        userViews.set(userId, []);
      }
      userViews.get(userId).push(view);
    });

    // Sort each user's views by most recent first
    userViews.forEach(views => {
      views.sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));
    });

    return userViews;
  }

  /**
   * Process retargeting notifications for a specific user
   */
  static async processUserRetargeting(userId, views) {
    const user = views[0].userId;
    let notificationsSent = 0;

    // Check if user should receive notifications (not too many already sent)
    const totalNotificationsSent = views.reduce((sum, view) => sum + (view.notificationsSent || 0), 0);
    
    if (totalNotificationsSent >= 2) {
      return { notificationsSent: 0 };
    }

    // Get the most viewed car (first in sorted array)
    const mostViewedCar = views[0].carId;
    
    // Check if we should send notification for this car
    const shouldSendNotification = await this.shouldSendNotification(userId, mostViewedCar._id);
    
    if (!shouldSendNotification) {
      return { notificationsSent: 0 };
    }

    // Send web notification
    await this.sendWebNotification(user, mostViewedCar);
    notificationsSent++;

    // Send email notification
    await this.sendEmailNotification(user, mostViewedCar);
    notificationsSent++;

    // Update notification count for this view
    await CarView.updateOne(
      { userId: userId, carId: mostViewedCar._id, viewedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      { 
        $inc: { notificationsSent: notificationsSent },
        $set: { lastNotificationSent: new Date() }
      }
    );

    return { notificationsSent };
  }

  /**
   * Check if we should send notification for this car
   */
  static async shouldSendNotification(userId, carId) {
    // Check if user has already purchased anything for this car
    const hasPurchased = await this.checkUserPurchases(userId, carId);
    
    if (hasPurchased.token || hasPurchased.bookNowToken || hasPurchased.ticket || hasPurchased.booking) {
      // Update the car view record only if user actually has purchases
      await CarView.updateOne(
        { userId, carId },
        { 
          hasPurchased: true,
          $set: {
            'purchaseTypes.token': hasPurchased.token,
            'purchaseTypes.bookNowToken': hasPurchased.bookNowToken,
            'purchaseTypes.ticket': hasPurchased.ticket,
            'purchaseTypes.booking': hasPurchased.booking
          }
        }
      );
      return false;
    }

    // Check if car is still available for purchase
    const car = await Car.findById(carId);
    if (!car || car.status === 'cancelled' || car.stopBookings) {
      return false;
    }

    return true;
  }

  /**
   * Check if user has made any purchases for the car
   */
  static async checkUserPurchases(userId, carId) {
    const [tokenPurchase, bookNowTokenPurchase, bookingPurchase] = await Promise.all([
      Token.findOne({ userid: userId, carid: carId, status: 'active' }),
      BookNowToken.findOne({ userid: userId, carid: carId, status: 'active' }),
      Booking.findOne({ userid: userId, carid: carId, status: 'accepted' })
    ]);

    return {
      token: !!tokenPurchase,
      bookNowToken: !!bookNowTokenPurchase,
      ticket: false, // Tickets are created from tokens, so this is covered by token check
      booking: !!bookingPurchase
    };
  }

  /**
   * Send web notification
   */
  static async sendWebNotification(user, car) {
    const notification = new Notification({
      recipientId: user._id,
      recipientModel: 'User',
      title: 'Don\'t Miss Out!',
      message: `You viewed ${car.carname} (${car.brandname}) but haven't made a purchase yet. Limited slots available!`,
      type: 'retargeting_notification',
      relatedEntityId: car._id,
      relatedEntityModel: 'Car',
      metadata: {
        carName: car.carname,
        brandName: car.brandname,
        carPrice: car.price,
        fractionPrice: car.fractionprice,
        isRetargeting: true
      },
      priority: 'medium'
    });

    await notification.save();
    logger(`Web notification sent to user ${user.email} for car ${car.carname}`);
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(user, car) {
    try {
      // Read the retargeting notification template
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '..', 'templates', 'retargeting-notification.html');
      const template = fs.readFileSync(templatePath, 'utf8');
      
      // Prepare template data
      const templateData = {
        userName: user.name,
        carName: car.carname,
        brandName: car.brandname,
        carPrice: car.price || '0',
        fractionPrice: car.fractionprice || '0',
        carImages: car.images || [],
        viewUrl: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/car-details/${car._id}`
      };
      
      // Replace placeholders in template
      let htmlContent = template;
      for (const [key, value] of Object.entries(templateData)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(placeholder, value || '');
      }
      
      // Send email using the correct function signature
      await EmailService.sendEmail(
        user.email,
        `Don't Miss Out on ${car.carname} - Limited Time Offer!`,
        htmlContent
      );
      
      logger(`Email notification sent to user ${user.email} for car ${car.carname}`);
    } catch (error) {
      logger(`Error sending email notification to user ${user.email}: ${error.message}`);
      // Don't fail the retargeting process if email fails
    }
  }

  /**
   * Track a car view for retargeting purposes
   */
  static async trackCarView(userId, carId) {
    try {
      // Check if user has already viewed this car today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingView = await CarView.findOne({
        userId,
        carId,
        viewedAt: { $gte: today, $lt: tomorrow }
      });

      if (existingView) {
        // Update existing view count or other metrics if needed
        return existingView;
      }

      // Create new view record
      const carView = new CarView({
        userId,
        carId,
        viewedAt: new Date()
      });

      await carView.save();
      return carView;

    } catch (error) {
      logger(`Error tracking car view: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update purchase status when user makes a purchase
   */
  static async updatePurchaseStatus(userId, carId, purchaseType) {
    try {
      const updateData = {
        hasPurchased: true,
        [`purchaseTypes.${purchaseType}`]: true
      };

      await CarView.updateMany(
        { userId, carId },
        updateData
      );

      logger(`Updated purchase status for user ${userId} and car ${carId} for ${purchaseType}`);
    } catch (error) {
      logger(`Error updating purchase status: ${error.message}`);
    }
  }
}

module.exports = RetargetingNotificationService;
