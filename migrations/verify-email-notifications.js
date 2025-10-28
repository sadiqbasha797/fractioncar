/**
 * Verification Script: Check Email Notification Preferences Status
 * 
 * This script checks the status of email notification preferences
 * across all users in the database.
 * 
 * Usage: node migrations/verify-email-notifications.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

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

// Run the verification
const runVerification = async () => {
  try {
    console.log('\n🔍 Verifying email notification preferences status...\n');

    // Get total user count
    const totalUsers = await User.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);

    // Count users with preferences
    const usersWithPreferences = await User.countDocuments({
      emailNotifications: { $exists: true }
    });

    // Count users without preferences
    const usersWithoutPreferences = await User.countDocuments({
      emailNotifications: { $exists: false }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 Email Notification Preferences Status:');
    console.log('='.repeat(60));
    console.log(`✅ Users with preferences: ${usersWithPreferences} (${((usersWithPreferences / totalUsers) * 100).toFixed(2)}%)`);
    console.log(`❌ Users without preferences: ${usersWithoutPreferences} (${((usersWithoutPreferences / totalUsers) * 100).toFixed(2)}%)`);
    console.log('='.repeat(60));

    // Check preference distribution
    if (usersWithPreferences > 0) {
      console.log('\n📈 Preference Distribution Analysis:');
      console.log('='.repeat(60));

      const allEnabledCount = await User.countDocuments({
        'emailNotifications.enabled': true
      });
      const allDisabledCount = await User.countDocuments({
        'emailNotifications.enabled': false
      });

      console.log(`🔔 Master toggle enabled: ${allEnabledCount} users`);
      console.log(`🔕 Master toggle disabled: ${allDisabledCount} users`);

      // Check individual notification types
      const notificationTypes = [
        'tokenPurchase',
        'bookNowToken',
        'amcPayment',
        'booking',
        'kyc',
        'refund',
        'sharedMember'
      ];

      console.log('\n📋 Individual Notification Types:');
      for (const type of notificationTypes) {
        const enabledCount = await User.countDocuments({
          [`emailNotifications.${type}`]: true
        });
        const disabledCount = await User.countDocuments({
          [`emailNotifications.${type}`]: false
        });
        
        console.log(`   ${type.padEnd(20)}: ✅ ${enabledCount} enabled, ❌ ${disabledCount} disabled`);
      }
    }

    // Show sample users
    if (usersWithPreferences > 0) {
      console.log('\n📋 Sample Users with Preferences:');
      console.log('='.repeat(60));
      
      const sampleUsers = await User.find({ emailNotifications: { $exists: true } })
        .limit(5)
        .select('name email emailNotifications createdAt');
      
      sampleUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
        console.log(`   Master Toggle: ${user.emailNotifications.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        
        const disabledTypes = [];
        Object.entries(user.emailNotifications.toObject()).forEach(([key, value]) => {
          if (key !== 'enabled' && value === false) {
            disabledTypes.push(key);
          }
        });
        
        if (disabledTypes.length > 0) {
          console.log(`   Disabled types: ${disabledTypes.join(', ')}`);
        } else {
          console.log(`   All notification types: ✅ Enabled`);
        }
      });
    }

    // Show users without preferences (if any)
    if (usersWithoutPreferences > 0) {
      console.log('\n⚠️  Users Without Preferences:');
      console.log('='.repeat(60));
      
      const usersNeedingMigration = await User.find({ emailNotifications: { $exists: false } })
        .limit(10)
        .select('name email createdAt');
      
      usersNeedingMigration.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - Created: ${user.createdAt.toLocaleDateString()}`);
      });

      if (usersWithoutPreferences > 10) {
        console.log(`\n... and ${usersWithoutPreferences - 10} more users`);
      }

      console.log('\n💡 Recommendation: Run the migration script to add preferences to these users.');
      console.log('   Command: node migrations/add-email-notifications-to-users.js');
    }

    // Final status
    console.log('\n' + '='.repeat(60));
    if (usersWithoutPreferences === 0) {
      console.log('✅ STATUS: All users have email notification preferences!');
      console.log('✅ Migration is complete and successful.');
    } else {
      console.log('⚠️  STATUS: Some users are missing email notification preferences.');
      console.log('⚠️  Migration is needed for these users.');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await runVerification();
    
    console.log('\n✅ Verification completed successfully!');
    console.log('🔌 Closing database connection...');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the verification
main();
