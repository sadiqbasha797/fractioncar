const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Rollback script to remove viewCount field from cars
 * This script will:
 * 1. Connect to the database
 * 2. Remove viewCount field from all cars
 * 3. Log the rollback results
 * 
 * WARNING: This will permanently remove all view count data!
 */

async function migrateRemoveViewCount() {
  const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction');
  
  try {
    console.log('⚠️  Starting rollback: Remove viewCount field from cars');
    console.log('=' .repeat(60));
    console.log('🚨 WARNING: This will permanently remove all view count data!');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const carsCollection = db.collection('cars');
    
    // Get total count of cars before rollback
    const totalCars = await carsCollection.countDocuments();
    console.log(`📊 Total cars in database: ${totalCars}`);
    
    if (totalCars === 0) {
      console.log('ℹ️  No cars found in database. Rollback not needed.');
      return;
    }
    
    // Count cars with viewCount field
    const carsWithViewCount = await carsCollection.countDocuments({
      viewCount: { $exists: true }
    });
    
    console.log(`🔍 Cars with viewCount field: ${carsWithViewCount}`);
    
    if (carsWithViewCount === 0) {
      console.log('✅ No cars have viewCount field. Rollback not needed.');
      return;
    }
    
    // Show sample of cars that will be affected
    console.log('\n📋 Sample of cars that will be affected:');
    const sampleCars = await carsCollection.find({ viewCount: { $exists: true } })
      .limit(5)
      .project({ carname: 1, brandname: 1, viewCount: 1 })
      .toArray();
    
    sampleCars.forEach((car, index) => {
      console.log(`   ${index + 1}. ${car.carname || car.brandname || 'Unknown'} - viewCount: ${car.viewCount}`);
    });
    
    // Remove viewCount field from all cars
    console.log('\n🔄 Removing viewCount field from all cars...');
    
    const updateResult = await carsCollection.updateMany(
      { viewCount: { $exists: true } },
      { $unset: { viewCount: 1 } }
    );
    
    console.log(`✅ Successfully removed viewCount field from ${updateResult.modifiedCount} cars`);
    
    // Verify the rollback
    console.log('🔍 Verifying rollback...');
    
    const carsStillWithViewCount = await carsCollection.countDocuments({
      viewCount: { $exists: true }
    });
    
    const carsWithoutViewCount = await carsCollection.countDocuments({
      viewCount: { $exists: false }
    });
    
    console.log(`📊 Cars without viewCount field: ${carsWithoutViewCount}`);
    console.log(`📊 Cars still with viewCount: ${carsStillWithViewCount}`);
    
    if (carsStillWithViewCount === 0) {
      console.log('✅ Rollback completed successfully!');
      console.log('=' .repeat(60));
      console.log('📋 Rollback Summary:');
      console.log(`   • Total cars processed: ${totalCars}`);
      console.log(`   • Cars updated: ${updateResult.modifiedCount}`);
      console.log(`   • Cars without viewCount field: ${carsWithoutViewCount}`);
      console.log(`   • Rollback status: SUCCESS ✅`);
    } else {
      console.log('❌ Rollback completed with issues!');
      console.log(`   • ${carsStillWithViewCount} cars still have viewCount field`);
      console.log('   • Please check the database manually');
    }
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the rollback
if (require.main === module) {
  migrateRemoveViewCount()
    .then(() => {
      console.log('🎉 Rollback script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Rollback script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateRemoveViewCount;
