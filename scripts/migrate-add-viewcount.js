const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Migration script to add viewCount field to existing cars
 * This script will:
 * 1. Connect to the database
 * 2. Find all cars without viewCount field
 * 3. Add viewCount: 0 to all existing cars
 * 4. Log the migration results
 */

async function migrateAddViewCount() {
  const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction');
  
  try {
    console.log('🚀 Starting migration: Add viewCount field to existing cars');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const carsCollection = db.collection('cars');
    
    // Get total count of cars before migration
    const totalCars = await carsCollection.countDocuments();
    console.log(`📊 Total cars in database: ${totalCars}`);
    
    if (totalCars === 0) {
      console.log('ℹ️  No cars found in database. Migration not needed.');
      return;
    }
    
    // Find cars that don't have viewCount field or have it as undefined/null
    const carsWithoutViewCount = await carsCollection.countDocuments({
      $or: [
        { viewCount: { $exists: false } },
        { viewCount: null },
        { viewCount: undefined }
      ]
    });
    
    console.log(`🔍 Cars without viewCount field: ${carsWithoutViewCount}`);
    
    if (carsWithoutViewCount === 0) {
      console.log('✅ All cars already have viewCount field. Migration not needed.');
      return;
    }
    
    // Update all cars without viewCount to have viewCount: 0
    console.log('🔄 Updating cars with viewCount: 0...');
    
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
    
    console.log(`✅ Successfully updated ${updateResult.modifiedCount} cars`);
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const carsStillWithoutViewCount = await carsCollection.countDocuments({
      $or: [
        { viewCount: { $exists: false } },
        { viewCount: null },
        { viewCount: undefined }
      ]
    });
    
    const carsWithViewCount = await carsCollection.countDocuments({
      viewCount: { $exists: true, $ne: null }
    });
    
    console.log(`📊 Cars with viewCount field: ${carsWithViewCount}`);
    console.log(`📊 Cars still without viewCount: ${carsStillWithoutViewCount}`);
    
    if (carsStillWithoutViewCount === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('=' .repeat(60));
      console.log('📋 Migration Summary:');
      console.log(`   • Total cars processed: ${totalCars}`);
      console.log(`   • Cars updated: ${updateResult.modifiedCount}`);
      console.log(`   • Cars with viewCount field: ${carsWithViewCount}`);
      console.log(`   • Migration status: SUCCESS ✅`);
    } else {
      console.log('❌ Migration completed with issues!');
      console.log(`   • ${carsStillWithoutViewCount} cars still don't have viewCount field`);
      console.log('   • Please check the database manually');
    }
    
    // Show sample of updated cars
    console.log('\n📋 Sample of updated cars:');
    const sampleCars = await carsCollection.find({ viewCount: 0 }).limit(5).project({ carname: 1, brandname: 1, viewCount: 1 }).toArray();
    sampleCars.forEach((car, index) => {
      console.log(`   ${index + 1}. ${car.carname || car.brandname || 'Unknown'} - viewCount: ${car.viewCount}`);
    });
    
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
  migrateAddViewCount()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateAddViewCount;
