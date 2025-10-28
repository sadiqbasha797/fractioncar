const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction';

async function updateCarsStopBookings() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db();
    const carsCollection = db.collection('cars');
    
    // Check how many cars exist
    const totalCars = await carsCollection.countDocuments();
    console.log(`Total cars in database: ${totalCars}`);
    
    // Check how many cars don't have stopBookings field
    const carsWithoutStopBookings = await carsCollection.countDocuments({
      stopBookings: { $exists: false }
    });
    console.log(`Cars without stopBookings field: ${carsWithoutStopBookings}`);
    
    if (carsWithoutStopBookings === 0) {
      console.log('All cars already have stopBookings field. No update needed.');
      return;
    }
    
    // Update all cars that don't have stopBookings field
    console.log('Updating cars...');
    const updateResult = await carsCollection.updateMany(
      { stopBookings: { $exists: false } },
      { $set: { stopBookings: false } }
    );
    
    console.log(`Successfully updated ${updateResult.modifiedCount} cars`);
    console.log('All cars now have stopBookings field set to false (bookings allowed)');
    
    // Verify the update
    const carsWithStopBookings = await carsCollection.countDocuments({
      stopBookings: { $exists: true }
    });
    console.log(`Verification: ${carsWithStopBookings} cars now have stopBookings field`);
    
    // Show some examples
    const sampleCars = await carsCollection.find({}).limit(3).project({ carname: 1, stopBookings: 1 }).toArray();
    console.log('Sample updated cars:');
    sampleCars.forEach(car => {
      console.log(`- ${car.carname}: stopBookings = ${car.stopBookings}`);
    });
    
  } catch (error) {
    console.error('Error updating cars:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

// Run the update
updateCarsStopBookings()
  .then(() => {
    console.log('Update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
