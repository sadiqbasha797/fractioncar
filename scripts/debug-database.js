const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Debug script to check database connection and car data
 */

async function debugDatabase() {
  const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction');
  
  try {
    console.log('🔍 Database Debug Script');
    console.log('=' .repeat(50));
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`   MONGO_URI: ${process.env.MONGO_URI ? '✅ Set' : '❌ Not set'}`);
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not set'}`);
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction';
    console.log(`\n🔌 Connecting to: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    console.log(`📊 Database Name: ${db.databaseName}`);
    
    // List all collections
    console.log('\n📁 Collections in database:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`   • ${col.name}`);
    });
    
    // Check cars collection specifically
    console.log('\n🚗 Cars Collection Analysis:');
    const carsCollection = db.collection('cars');
    
    // Count total documents
    const totalCars = await carsCollection.countDocuments();
    console.log(`   Total cars: ${totalCars}`);
    
    if (totalCars > 0) {
      // Get sample car
      const sampleCar = await carsCollection.findOne();
      console.log(`   Sample car ID: ${sampleCar._id}`);
      console.log(`   Sample car name: ${sampleCar.carname || sampleCar.brandname || 'Unknown'}`);
      console.log(`   Sample car has viewCount: ${'viewCount' in sampleCar}`);
      console.log(`   Sample car viewCount value: ${sampleCar.viewCount}`);
      
      // Check for cars with/without viewCount
      const carsWithViewCount = await carsCollection.countDocuments({ viewCount: { $exists: true } });
      const carsWithoutViewCount = await carsCollection.countDocuments({ viewCount: { $exists: false } });
      
      console.log(`   Cars with viewCount field: ${carsWithViewCount}`);
      console.log(`   Cars without viewCount field: ${carsWithoutViewCount}`);
      
      // Show first few cars
      console.log('\n📋 First 5 cars:');
      const firstFiveCars = await carsCollection.find({}).limit(5).project({ carname: 1, brandname: 1, viewCount: 1, createdAt: 1 }).toArray();
      firstFiveCars.forEach((car, index) => {
        console.log(`   ${index + 1}. ${car.carname || car.brandname || 'Unknown'} (ID: ${car._id}) - viewCount: ${car.viewCount || 'undefined'}`);
      });
    } else {
      console.log('   ❌ No cars found in database');
    }
    
    console.log('\n✅ Debug completed successfully!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the debug
if (require.main === module) {
  debugDatabase()
    .then(() => {
      console.log('🎉 Debug script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = debugDatabase;
