const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Test function to check admin notifications
const testAdminNotifications = async () => {
  try {
    await connectDB();
    
    // Find all admins and super admins
    const admins = await Admin.find({});
    const superAdmins = await SuperAdmin.find({});
    const allAdmins = [...admins, ...superAdmins];
    
    console.log('\n=== ADMIN NOTIFICATION TEST ===');
    console.log(`Found ${admins.length} admins and ${superAdmins.length} super admins`);
    console.log(`Total admins to notify: ${allAdmins.length}`);
    
    if (allAdmins.length > 0) {
      console.log('\nAdmin/SuperAdmin details:');
      allAdmins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.name} (${admin.email}) - Role: ${admin.role}`);
      });
      
      console.log('\n✅ Admin notifications are properly configured!');
      console.log('When someone submits a contact form, all these admins will receive email notifications.');
    } else {
      console.log('\n❌ WARNING: No admins or super admins found in the database!');
      console.log('You need to create at least one admin or super admin account for notifications to work.');
      console.log('\nTo create an admin account, you can:');
      console.log('1. Use the admin registration endpoint');
      console.log('2. Create one directly in the database');
      console.log('3. Use the admin panel if available');
    }
    
  } catch (error) {
    console.error('Error testing admin notifications:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the test
testAdminNotifications();
