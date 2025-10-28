const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Car schema (same as in models/Car.js)
const carSchema = new mongoose.Schema({
  carname: { type: String, required: false },
  color: { type: String, required: false },
  milege: { type: String, required: false },
  seating: { type: Number, required: false },
  features: { type: [String], required: false },
  brandname: { type: String, required: false },
  price: { type: String, required: false },
  fractionprice: { type: String, required: false },
  tokenprice: { type: String, required: false },
  amcperticket: { type: String, required: false },
  contractYears: { type: Number, required: false, default: 5 },
  status: { type: String, enum: ['active', 'pending', 'cancelled'], default: 'pending' },
  ticketsavilble: { type: Number, required: false },
  totaltickets: { type: Number, required: false, default: 12 },
  bookNowTokenAvailable: { type: Number, required: false, default: 12 },
  bookNowTokenPrice: { type: String, required: false },
  tokensavailble: { type: Number, required: false },
  images: { type: [String], required: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: false, refPath: 'createdByModel' },
  createdByModel: { type: String, required: false, enum: ['Admin', 'SuperAdmin'] },
  createdAt: { type: Date, default: Date.now },
  location: { type: String, required: false },
  pincode: { type: String, required: false },
  description: { type: String, required: false },
  stopBookings: { type: Boolean, default: false, required: false }
});

const Car = mongoose.model('Car', carSchema);

// Update cars that don't have stopBookings field
const updateCarsStopBookings = async () => {
  try {
    console.log('Starting update process...');
    
    // First, let's check total cars in database
    const totalCars = await Car.countDocuments();
    console.log(`Total cars in database: ${totalCars}`);
    
    // Find cars that don't have the stopBookings field
    const carsWithoutStopBookings = await Car.find({
      stopBookings: { $exists: false }
    });
    
    console.log(`Found ${carsWithoutStopBookings.length} cars without stopBookings field`);
    
    // Also check cars that have stopBookings field
    const carsWithStopBookings = await Car.find({
      stopBookings: { $exists: true }
    });
    console.log(`Found ${carsWithStopBookings.length} cars with stopBookings field`);
    
    if (carsWithoutStopBookings.length === 0) {
      console.log('All cars already have stopBookings field. No update needed.');
      return;
    }
    
    // Update all cars to add stopBookings field with default value false
    const updateResult = await Car.updateMany(
      { stopBookings: { $exists: false } },
      { $set: { stopBookings: false } }
    );
    
    console.log(`Successfully updated ${updateResult.modifiedCount} cars`);
    console.log('All cars now have stopBookings field set to false (bookings allowed)');
    
    // Verify the update
    const updatedCars = await Car.find({ stopBookings: { $exists: true } });
    console.log(`Verification: ${updatedCars.length} cars now have stopBookings field`);
    
    // Show some examples
    const sampleCars = await Car.find({}).limit(3).select('carname stopBookings');
    console.log('Sample updated cars:');
    sampleCars.forEach(car => {
      console.log(`- ${car.carname}: stopBookings = ${car.stopBookings}`);
    });
    
  } catch (error) {
    console.error('Error updating cars:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await updateCarsStopBookings();
    console.log('Update completed successfully!');
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the script
main();
