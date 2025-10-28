/**
 * Migration Script: Add Email Notification Preferences to Existing Users
 * 
 * This script adds the emailNotifications field to all existing users
 * who don't have it yet. All preferences are set to true by default.
 * 
 * Usage: node migrations/add-email-notifications-to-users.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

// Default email notification preferences
const defaultEmailNotifications = {
  enabled: true,
  tokenPurchase: true,
  bookNowToken: true,
  amcPayment: true,
  booking: true,
  kyc: true,
  refund: true,
  sharedMember: true
};

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

// Run the migration
const runMigration = async () => {
  try {
    console.log('\n🔄 Starting migration: Add email notification preferences to users...\n');

    // Find all users without emailNotifications field
    const usersWithoutPreferences = await User.find({
      emailNotifications: { $exists: false }
    });

    console.log(`📊 Found ${usersWithoutPreferences.length} users without email notification preferences`);

    if (usersWithoutPreferences.length === 0) {
      console.log('✅ All users already have email notification preferences. No migration needed.');
      return;
    }

    // Update users in batches for better performance
    const batchSize = 100;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < usersWithoutPreferences.length; i += batchSize) {
      const batch = usersWithoutPreferences.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} users)...`);

      for (const user of batch) {
        try {
          user.emailNotifications = defaultEmailNotifications;
          await user.save();
          updatedCount++;
          
          // Show progress every 10 users
          if (updatedCount % 10 === 0) {
            console.log(`   ✓ Updated ${updatedCount} users...`);
          }
        } catch (error) {
          errorCount++;
          console.error(`   ✗ Error updating user ${user._id}: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`❌ Failed to update: ${errorCount} users`);
    console.log(`📈 Total processed: ${usersWithoutPreferences.length} users`);
    console.log('='.repeat(60));

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const remainingUsers = await User.find({
      emailNotifications: { $exists: false }
    });

    if (remainingUsers.length === 0) {
      console.log('✅ Verification successful! All users now have email notification preferences.');
    } else {
      console.log(`⚠️  Warning: ${remainingUsers.length} users still don't have preferences.`);
      console.log('   You may need to run the migration again.');
    }

    // Show sample of updated users
    console.log('\n📋 Sample of updated users:');
    const sampleUsers = await User.find({ emailNotifications: { $exists: true } })
      .limit(3)
      .select('name email emailNotifications');
    
    sampleUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Email Notifications:`, user.emailNotifications);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await runMigration();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('🔌 Closing database connection...');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the migration
main();
