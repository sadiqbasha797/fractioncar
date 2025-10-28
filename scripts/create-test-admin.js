const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const bcrypt = require('bcryptjs');
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

// Create a test admin for contact notifications
const createTestAdmin = async () => {
  try {
    await connectDB();
    
    // Check if any admins exist
    const existingAdmins = await Admin.find({});
    const existingSuperAdmins = await SuperAdmin.find({});
    
    if (existingAdmins.length > 0 || existingSuperAdmins.length > 0) {
      console.log('✅ Admins already exist in the database');
      console.log(`Found ${existingAdmins.length} admins and ${existingSuperAdmins.length} super admins`);
      return;
    }
    
    console.log('No admins found. Creating a test super admin...');
    
    // Create a test super admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const testSuperAdmin = new SuperAdmin({
      name: 'Test Super Admin',
      email: 'admin@fractioncar.com', // Change this to your actual admin email
      password: hashedPassword,
      phone: '+91 9999999999',
      role: 'superadmin'
    });
    
    await testSuperAdmin.save();
    
    console.log('✅ Test super admin created successfully!');
    console.log('Email: admin@fractioncar.com');
    console.log('Password: admin123');
    console.log('\n⚠️  IMPORTANT: Please change the email and password in production!');
    console.log('This is just for testing contact form notifications.');
    
  } catch (error) {
    console.error('Error creating test admin:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the script
createTestAdmin();
