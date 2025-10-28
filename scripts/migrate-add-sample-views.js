const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Migration script to add sample view counts to cars for testing
 * This script will:
 * 1. Connect to the database
 * 2. Add viewCount field to cars that don't have it
 * 3. Add random sample view counts to cars for testing
 * 4. Log the migration results
 */

async function migrateAddSampleViews() {
  const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction');
  
  try {
    console.log('🚀 Starting migration: Add sample view counts to cars');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const carsCollection = db.collection('cars');
    
    // Get total count of cars
    const totalCars = await carsCollection.countDocuments();
    console.log(`📊 Total cars in database: ${totalCars}`);
    
    if (totalCars === 0) {
      console.log('ℹ️  No cars found in database. Migration not needed.');
      return;
    }
    
    // First, ensure all cars have viewCount field
    console.log('🔄 Ensuring all cars have viewCount field...');
    
    const updateResult = await carsCollection.updateMany(
      {
        $or: [
          { viewCount: { $exists: false } },
          { viewCount: null },
          { viewCount: undefined }
        ]
      },
      {
        $set: { viewCount: 0 }
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} cars with viewCount: 0`);
    
    // Get all cars with viewCount 0
    const carsToUpdate = await carsCollection.find({ viewCount: 0 }).toArray();
    console.log(`📋 Processing ${carsToUpdate.length} cars...`);
    
    // Add sample view counts
    console.log(`🔄 Adding sample view counts to ${carsToUpdate.length} cars...`);
    
    const updatePromises = carsToUpdate.map(async (car) => {
      // Generate random view count between 5 and 200
      const randomViewCount = Math.floor(Math.random() * 196) + 5;
      
      return carsCollection.updateOne(
        { _id: car._id },
        { $set: { viewCount: randomViewCount } }
      );
    });
    
    const updateResults = await Promise.all(updatePromises);
    const updatedCount = updateResults.filter(result => result.modifiedCount > 0).length;
    
    console.log(`✅ Successfully added sample view counts to ${updatedCount} cars`);
    
    // Show statistics
    const stats = await carsCollection.aggregate([
      {
        $group: {
          _id: null,
          totalCars: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          avgViews: { $avg: '$viewCount' },
          maxViews: { $max: '$viewCount' },
          minViews: { $min: '$viewCount' }
        }
      }
    ]).toArray();
    
    if (stats.length > 0) {
      const stat = stats[0];
      console.log('\n📊 View Count Statistics:');
      console.log(`   • Total cars: ${stat.totalCars}`);
      console.log(`   • Total views: ${stat.totalViews}`);
      console.log(`   • Average views per car: ${stat.avgViews.toFixed(2)}`);
      console.log(`   • Highest view count: ${stat.maxViews}`);
      console.log(`   • Lowest view count: ${stat.minViews}`);
    }
    
    // Show most browsed cars
    console.log('\n🏆 Top 5 Most Browsed Cars:');
    const mostBrowsedCars = await carsCollection.find({})
      .sort({ viewCount: -1 })
      .limit(5)
      .project({ carname: 1, brandname: 1, viewCount: 1 })
      .toArray();
    
    mostBrowsedCars.forEach((car, index) => {
      console.log(`   ${index + 1}. ${car.carname || car.brandname || 'Unknown'} - ${car.viewCount} views`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('=' .repeat(60));
    console.log('📋 Migration Summary:');
    console.log(`   • Cars with viewCount field added: ${updateResult.modifiedCount}`);
    console.log(`   • Cars with sample view counts: ${updatedCount}`);
    console.log(`   • Migration status: SUCCESS ✅`);
    console.log('\n💡 Note: This migration added sample data for testing purposes.');
    console.log('   In production, view counts should be tracked from actual user interactions.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  migrateAddSampleViews()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateAddSampleViews;
