const mongoose = require('mongoose');
const NotificationService = require('./utils/notificationService');
const AMCReminderService = require('./utils/amcReminderService');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Test notification creation
const testNotifications = async () => {
  try {
    console.log('Testing notification system...');
    
    // Test user notification
    const userNotification = await NotificationService.createUserNotification(
      '507f1f77bcf86cd799439011', // Sample user ID
      'welcome',
      '🎉 Welcome to Fraction!',
      'Welcome to Fraction! Your account has been created successfully.',
      { userName: 'Test User' }
    );
    console.log('✅ User notification created:', userNotification._id);
    
    // Test admin notification
    const adminNotifications = await NotificationService.createAdminNotification(
      'user_joined_waitlist',
      '👤 User Joined Waitlist',
      'A new user has joined the waitlist for a car.',
      { userName: 'Test User', carName: 'Test Car' }
    );
    console.log('✅ Admin notifications created:', adminNotifications.length);
    
    // Test AMC reminder check
    const reminderResult = await AMCReminderService.checkAndSendReminders();
    console.log('✅ AMC reminder check completed:', reminderResult);
    
    console.log('🎉 All notification tests passed!');
    
  } catch (error) {
    console.error('❌ Notification test failed:', error.message);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await testNotifications();
  await mongoose.connection.close();
  console.log('Database connection closed');
};

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testNotifications };
