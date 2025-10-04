const mongoose = require('mongoose');
const FAQ = require('./models/FAQ');
const FAQCategory = require('./models/FAQCategory');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration function
const migrateFaqCategories = async () => {
  try {
    console.log('Starting FAQ categories migration...');

    // Define the old hardcoded categories
    const oldCategories = ['Understanding', 'Pricing', 'Car Delivery', 'Car Usage Policy'];

    // Create FAQ categories if they don't exist
    for (const categoryName of oldCategories) {
      const existingCategory = await FAQCategory.findOne({ name: categoryName });
      if (!existingCategory) {
        const newCategory = new FAQCategory({
          name: categoryName,
          description: `FAQ category for ${categoryName}`,
          isActive: true
        });
        await newCategory.save();
        console.log(`Created category: ${categoryName}`);
      } else {
        console.log(`Category already exists: ${categoryName}`);
      }
    }

    // Get all FAQs and ensure they have valid categories
    const faqs = await FAQ.find({});
    console.log(`Found ${faqs.length} FAQs to check`);

    for (const faq of faqs) {
      if (faq.category && oldCategories.includes(faq.category)) {
        // Category is valid, no need to change
        console.log(`FAQ "${faq.question}" has valid category: ${faq.category}`);
      } else {
        // Set default category if invalid
        faq.category = 'Understanding';
        await faq.save();
        console.log(`Updated FAQ "${faq.question}" to use default category: Understanding`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await migrateFaqCategories();
};

runMigration();
