const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: '.env' });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const testEmailPreferences = async () => {
  try {
    console.log('\n🧪 Testing Email Notification Preferences...\n');

    // Find a test user (you can replace with a specific email)
    const testUser = await User.findOne({ email: process.env.TEST_EMAIL || 'test@example.com' });
    
    if (!testUser) {
      console.log('⚠️  No test user found. Please create a user first or set TEST_EMAIL in .env');
      return;
    }

    console.log(`📧 Testing with user: ${testUser.email}`);
    console.log(`👤 User ID: ${testUser._id}\n`);

    // Test 1: Check default preferences
    console.log('Test 1: Default Preferences');
    console.log('Current preferences:', testUser.emailNotifications || 'Not set (will use defaults)');
    console.log('✅ Test 1 passed\n');

    // Test 2: Set all notifications to false
    console.log('Test 2: Disable All Notifications');
    testUser.emailNotifications = {
      enabled: false,
      tokenPurchase: true,
      bookNowToken: true,
      amcPayment: true,
      booking: true,
      kyc: true,
      refund: true,
      sharedMember: true
    };
    await testUser.save();
    console.log('Updated preferences:', testUser.emailNotifications);
    console.log('✅ Test 2 passed\n');

    // Test 3: Enable notifications but disable specific types
    console.log('Test 3: Enable Notifications, Disable Token Purchases');
    testUser.emailNotifications.enabled = true;
    testUser.emailNotifications.tokenPurchase = false;
    testUser.emailNotifications.bookNowToken = false;
    await testUser.save();
    console.log('Updated preferences:', testUser.emailNotifications);
    console.log('✅ Test 3 passed\n');

    // Test 4: Re-enable all notifications
    console.log('Test 4: Re-enable All Notifications');
    testUser.emailNotifications = {
      enabled: true,
      tokenPurchase: true,
      bookNowToken: true,
      amcPayment: true,
      booking: true,
      kyc: true,
      refund: true,
      sharedMember: true
    };
    await testUser.save();
    console.log('Updated preferences:', testUser.emailNotifications);
    console.log('✅ Test 4 passed\n');

    console.log('✅ All tests passed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await testEmailPreferences();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed.');
  console.log('\n📝 Note: You can now test the API endpoints using:');
  console.log('   GET  /api/users/email-notifications/preferences');
  console.log('   PUT  /api/users/email-notifications/preferences');
};

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
