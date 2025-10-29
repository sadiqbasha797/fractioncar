const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Car = require('./models/Car');

// Import retargeting service
const RetargetingNotificationService = require('./utils/retargetingNotificationService');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Use MONGO_URI (the correct env variable name)
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Test retargeting notification
const testRetargetingNotification = async (userId) => {
  try {
    console.log('\n🔍 Fetching user and car data...\n');

    // Find specific user by ID
    const user = userId 
      ? await User.findById(userId)
      : await User.findOne({ email: { $exists: true, $ne: null } });
    
    if (!user) {
      console.log(`❌ User not found${userId ? ` with ID: ${userId}` : ''}`);
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Find a car with images
    const carWithImages = await Car.findOne({ 
      images: { $exists: true, $ne: [], $ne: null }
    });

    // If no car with images, try to find any car
    const car = carWithImages || await Car.findOne();

    if (!car) {
      console.log('❌ No cars found in database. Please create a car first.');
      return;
    }

    console.log(`✅ Found car: ${car.carname} - ${car.brandname}`);
    console.log(`   Price: ₹${car.price || 'N/A'}`);
    console.log(`   Fraction Price: ₹${car.fractionprice || 'N/A'}`);
    console.log(`   Images: ${car.images && car.images.length > 0 ? car.images.length + ' image(s)' : 'No images'}`);
    if (car.images && car.images.length > 0) {
      console.log(`   First image: ${car.images[0].substring(0, 60)}...`);
    }

    console.log('\n📧 Sending retargeting email notification...\n');

    // Send the email notification
    await RetargetingNotificationService.sendEmailNotification(user, car);

    console.log('✅ Retargeting email sent successfully!');
    console.log(`\n📬 Check the email inbox for: ${user.email}`);
    console.log('\n✨ Email should contain:');
    console.log(`   - User name: ${user.name}`);
    console.log(`   - Car name: ${car.carname}`);
    console.log(`   - Brand: ${car.brandname}`);
    if (car.images && car.images.length > 0) {
      console.log(`   - Car image: ${car.images[0].substring(0, 60)}...`);
      console.log('   - ✅ Image should be displayed in email (not showing {{#if}} syntax)');
    } else {
      console.log('   - ⚠️  No images for this car (image section should be hidden)');
    }

  } catch (error) {
    console.error('❌ Error testing retargeting notification:', error.message);
    console.error(error.stack);
  }
};

// Run the test
const runTest = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚗 RETARGETING EMAIL NOTIFICATION TEST');
  console.log('='.repeat(60));

  // Get user ID from command line argument or use default
  const targetUserId = process.argv[2] || null;
  
  if (targetUserId) {
    console.log(`🎯 Target User ID: ${targetUserId}`);
  }

  await connectDB();
  await testRetargetingNotification(targetUserId);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed!');
  console.log('='.repeat(60) + '\n');

  // Close database connection
  await mongoose.connection.close();
  console.log('Database connection closed.');
};

// Execute
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

