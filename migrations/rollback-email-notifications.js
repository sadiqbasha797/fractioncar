/**
 * Rollback Script: Remove Email Notification Preferences from Users
 * 
 * This script removes the emailNotifications field from all users.
 * Use this only if you need to rollback the migration.
 * 
 * ⚠️  WARNING: This will remove all user email notification preferences!
 * 
 * Usage: node migrations/rollback-email-notifications.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const readline = require('readline');
require('dotenv').config({ path: '../.env' });

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Ask for confirmation
const confirmRollback = () => {
  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will remove email notification preferences from ALL users!');
    console.log('⚠️  This action cannot be undone easily.\n');
    
    rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
};

// Run the rollback
const runRollback = async () => {
  try {
    console.log('\n🔄 Starting rollback: Remove email notification preferences...\n');

    // Find all users with emailNotifications field
    const usersWithPreferences = await User.find({
      emailNotifications: { $exists: true }
    });

    console.log(`📊 Found ${usersWithPreferences.length} users with email notification preferences`);

    if (usersWithPreferences.length === 0) {
      console.log('✅ No users have email notification preferences. Nothing to rollback.');
      return;
    }

    // Remove emailNotifications field using updateMany for better performance
    const result = await User.updateMany(
      { emailNotifications: { $exists: true } },
      { $unset: { emailNotifications: "" } }
    );

    console.log('\n' + '='.repeat(60));
    console.log('📊 Rollback Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully removed preferences from: ${result.modifiedCount} users`);
    console.log(`📈 Total matched: ${result.matchedCount} users`);
    console.log('='.repeat(60));

    // Verify the rollback
    console.log('\n🔍 Verifying rollback...');
    const remainingUsers = await User.find({
      emailNotifications: { $exists: true }
    });

    if (remainingUsers.length === 0) {
      console.log('✅ Verification successful! All email notification preferences have been removed.');
    } else {
      console.log(`⚠️  Warning: ${remainingUsers.length} users still have preferences.`);
      console.log('   You may need to run the rollback again.');
    }

  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    
    // Ask for confirmation
    const confirmed = await confirmRollback();
    
    if (!confirmed) {
      console.log('\n❌ Rollback cancelled by user.');
      await mongoose.connection.close();
      process.exit(0);
    }

    await runRollback();
    
    console.log('\n✅ Rollback completed successfully!');
    console.log('🔌 Closing database connection...');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the rollback
main();
