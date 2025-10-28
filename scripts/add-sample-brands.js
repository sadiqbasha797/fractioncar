const mongoose = require('mongoose');
const Brands = require('../models/Brands');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraction', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample brands data
const sampleBrands = [
  {
    brandName: 'Mercedes-Benz',
    brandLogo: 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png',
    subText: 'Luxury Cars'
  },
  {
    brandName: 'BMW',
    brandLogo: 'https://www.carlogos.org/car-logos/bmw-logo.png',
    subText: 'Performance Luxury'
  },
  {
    brandName: 'Audi',
    brandLogo: 'https://www.carlogos.org/car-logos/audi-logo.png',
    subText: 'Premium Cars'
  },
  {
    brandName: 'Tesla',
    brandLogo: 'https://www.carlogos.org/car-logos/tesla-logo.png',
    subText: 'Electric Vehicles'
  },
  {
    brandName: 'Porsche',
    brandLogo: 'https://www.carlogos.org/car-logos/porsche-logo.png',
    subText: 'Sports Cars'
  },
  {
    brandName: 'Lexus',
    brandLogo: 'https://www.carlogos.org/car-logos/lexus-logo.png',
    subText: 'Premium Luxury'
  },
  {
    brandName: 'Volvo',
    brandLogo: 'https://www.carlogos.org/car-logos/volvo-logo.png',
    subText: 'Safety & Comfort'
  },
  {
    brandName: 'Ford',
    brandLogo: 'https://www.carlogos.org/car-logos/ford-logo.png',
    subText: 'American Classics'
  },
  {
    brandName: 'Honda',
    brandLogo: 'https://www.carlogos.org/car-logos/honda-logo.png',
    subText: 'Reliable Cars'
  },
  {
    brandName: 'Chevrolet',
    brandLogo: 'https://www.carlogos.org/car-logos/chevrolet-logo.png',
    subText: 'American SUVs'
  }
];

// Add sample brands to database
const addSampleBrands = async () => {
  try {
    // Clear existing brands
    await Brands.deleteMany({});
    console.log('Cleared existing brands');

    // Insert sample brands
    const insertedBrands = await Brands.insertMany(sampleBrands);
    console.log(`Successfully added ${insertedBrands.length} brands to the database`);

    // Display the added brands
    console.log('\nAdded brands:');
    insertedBrands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.brandName} - ${brand.subText}`);
    });

  } catch (error) {
    console.error('Error adding sample brands:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run the script
const runScript = async () => {
  await connectDB();
  await addSampleBrands();
};

runScript();
