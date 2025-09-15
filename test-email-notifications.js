const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Car = require('./models/Car');
const Token = require('./models/token');
const BookNowToken = require('./models/bookNowToken');
const AMC = require('./models/amc');

// Import email services
const {
  sendTokenPurchaseConfirmationEmail,
  sendBookNowTokenPurchaseConfirmationEmail,
  sendAMCPaymentConfirmationEmail,
  sendSuperAdminTokenPurchaseNotification,
  sendSuperAdminBookNowTokenPurchaseNotification,
  sendSuperAdminAMCPaymentNotification,
  sendBookingConfirmationEmail,
  sendSuperAdminBookingNotification
} = require('./utils/emailService');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Test email functions
const testEmailNotifications = async () => {
  try {
    console.log('🧪 Testing Email Notifications...\n');

    // Create test data
    const testUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test User',
      email: process.env.TEST_EMAIL || 'test@example.com',
      phone: '+91-9876543210'
    };

    const testCar = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Honda City',
      brand: 'Honda',
      year: 2023,
      location: 'Mumbai, Maharashtra',
      registrationNumber: 'MH01-AB-1234'
    };

    const testToken = {
      _id: new mongoose.Types.ObjectId(),
      customtokenid: 'TOKEN-001',
      amountpaid: 5000,
      date: new Date(),
      expirydate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'active'
    };

    const testBookNowToken = {
      _id: new mongoose.Types.ObjectId(),
      customtokenid: 'BOOKNOW-001',
      amountpaid: 10000,
      date: new Date(),
      expirydate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'active'
    };

    const testAMC = {
      _id: new mongoose.Types.ObjectId(),
      ticketid: new mongoose.Types.ObjectId(),
      amcamount: [
        {
          year: 2024,
          amount: 15000,
          paid: true,
          paiddate: new Date()
        },
        {
          year: 2025,
          amount: 15000,
          paid: true,
          paiddate: new Date()
        }
      ]
    };

    const testBooking = {
      _id: new mongoose.Types.ObjectId(),
      bookingFrom: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      bookingTo: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'accepted',
      comments: 'Test booking for email testing',
      createdAt: new Date()
    };

    console.log('📧 Testing Token Purchase Confirmation Email...');
    const tokenEmailResult = await sendTokenPurchaseConfirmationEmail(testUser, testToken, testCar);
    console.log('Token Email Result:', tokenEmailResult.success ? '✅ Success' : '❌ Failed');

    console.log('\n📧 Testing Book Now Token Purchase Confirmation Email...');
    const bookNowEmailResult = await sendBookNowTokenPurchaseConfirmationEmail(testUser, testBookNowToken, testCar);
    console.log('Book Now Token Email Result:', bookNowEmailResult.success ? '✅ Success' : '❌ Failed');

    console.log('\n📧 Testing AMC Payment Confirmation Email...');
    const amcEmailResult = await sendAMCPaymentConfirmationEmail(testUser, testAMC, testCar);
    console.log('AMC Email Result:', amcEmailResult.success ? '✅ Success' : '❌ Failed');

    console.log('\n📧 Testing SuperAdmin Token Purchase Notification...');
    const superAdminTokenResult = await sendSuperAdminTokenPurchaseNotification(testUser, testToken, testCar);
    console.log('SuperAdmin Token Email Result:', superAdminTokenResult.success ? '✅ Success' : '❌ Failed');

    console.log('\n📧 Testing SuperAdmin Book Now Token Purchase Notification...');
    const superAdminBookNowResult = await sendSuperAdminBookNowTokenPurchaseNotification(testUser, testBookNowToken, testCar);
    console.log('SuperAdmin Book Now Token Email Result:', superAdminBookNowResult.success ? '✅ Success' : '❌ Failed');

    console.log('\n📧 Testing SuperAdmin AMC Payment Notification...');
    const superAdminAMCResult = await sendSuperAdminAMCPaymentNotification(testUser, testAMC, testCar);
    console.log('SuperAdmin AMC Email Result:', superAdminAMCResult.success ? '✅ Success' : '❌ Failed');

    console.log('\n📧 Testing Booking Confirmation Email...');
    const bookingEmailResult = await sendBookingConfirmationEmail(testUser, testBooking, testCar);
    console.log('Booking Email Result:', bookingEmailResult.success ? '✅ Success' : '❌ Failed');

    console.log('\n📧 Testing SuperAdmin Booking Notification...');
    const superAdminBookingResult = await sendSuperAdminBookingNotification(testUser, testBooking, testCar);
    console.log('SuperAdmin Booking Email Result:', superAdminBookingResult.success ? '✅ Success' : '❌ Failed');

    console.log('\n🎉 Email notification testing completed!');
    console.log('\n📝 Note: Check your email inbox and spam folder for the test emails.');
    console.log('📝 Make sure to set TEST_EMAIL environment variable to your email address for testing.');

  } catch (error) {
    console.error('❌ Error testing email notifications:', error.message);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await testEmailNotifications();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed.');
  process.exit(0);
};

// Run the test
main().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
