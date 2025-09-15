const Car = require('../models/Car');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Create a new car
const createCar = async (req, res) => {
  try {
    const {
      carname,
      color,
      milege,
      seating,
      features,
      brandname,
      price,
      fractionprice,
      tokenprice,
      amcperticket,
      contractYears,
      ticketsavilble,
      totaltickets,
      tokensavailble,
      bookNowTokenAvailable,
      bookNowTokenPrice,
      location,
      pincode,
      description
    } = req.body;

    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(file.path);
          images.push(result.secure_url);
          // Delete the temporary file
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          logger(`Error uploading image to Cloudinary: ${uploadError.message}`);
          // Continue with other images even if one fails
        }
      }
    }

    const car = new Car({
      carname,
      color,
      milege,
      seating,
      features,
      brandname,
      price,
      fractionprice,
      tokenprice,
      amcperticket,
      contractYears,
      ticketsavilble,
      totaltickets,
      tokensavailble: 20, // Fixed to 20 tokens per car
      bookNowTokenAvailable,
      bookNowTokenPrice,
      images,
      location,
      pincode,
      description,
      createdBy: req.user.id,
      createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'Admin'
    });

    await car.save();
    res.status(201).json({
      status: 'success',
      body: { car },
      message: 'Car created successfully'
    });
  } catch (error) {
    logger(`Error in createCar: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all cars
const getCars = async (req, res) => {
  try {
    const cars = await Car.find();
    res.json({
      status: 'success',
      body: { cars },
      message: 'Cars retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getCars: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all cars without authentication
const getPublicCars = async (req, res) => {
  try {
    const cars = await Car.find();
    res.json({
      status: 'success',
      body: { cars },
      message: 'Cars retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicCars: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get a car by ID
const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }
    res.json({
      status: 'success',
      body: { car },
      message: 'Car retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getCarById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update a car by ID
const updateCar = async (req, res) => {
  try {
    const {
      carname,
      color,
      milege,
      seating,
      features,
      brandname,
      price,
      fractionprice,
      tokenprice,
      amcperticket,
      contractYears,
      status,
      ticketsavilble,
      totaltickets,
      tokensavailble,
      bookNowTokenAvailable,
      bookNowTokenPrice,
      location,
      pincode,
      description
    } = req.body;

    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }

    // Check if user is authorized to update this car
    // Admins and SuperAdmins can update any car
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this car'
      });
    }

    // Handle image uploads if provided
    let images = car.images || [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(file.path);
          images.push(result.secure_url);
          // Delete the temporary file
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          logger(`Error uploading image to Cloudinary: ${uploadError.message}`);
          // Continue with other images even if one fails
        }
      }
    }

    // Ensure tokensavailble never exceeds 20
    const updatedTokensAvailable = tokensavailble !== undefined ? Math.min(tokensavailble, 20) : undefined;

    const updatedCar = await Car.findByIdAndUpdate(
      req.params.id,
      {
        carname,
        color,
        milege,
        seating,
        features,
        brandname,
        price,
        fractionprice,
        tokenprice,
        amcperticket,
        contractYears,
        status,
        ticketsavilble,
        totaltickets,
        tokensavailble: updatedTokensAvailable,
        bookNowTokenAvailable,
        bookNowTokenPrice,
        images,
        location,
        pincode,
        description
      },
      { new: true }
    );

    res.json({
      status: 'success',
      body: { car: updatedCar },
      message: 'Car updated successfully'
    });
  } catch (error) {
    logger(`Error in updateCar: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete a car by ID
const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }

    // Check if user is authorized to delete this car
    // Admins and SuperAdmins can delete any car
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to delete this car'
      });
    }

    await Car.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      body: {},
      message: 'Car deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteCar: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get a car by ID without authentication
const getPublicCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }
    res.json({
      status: 'success',
      body: { car },
      message: 'Car retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicCarById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update bookNowTokenAvailable count (public route for payment updates)
const updateBookNowTokenCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookNowTokenAvailable } = req.body;

    if (bookNowTokenAvailable === undefined || bookNowTokenAvailable < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'bookNowTokenAvailable is required and must be >= 0'
      });
    }

    const car = await Car.findByIdAndUpdate(
      id,
      { bookNowTokenAvailable },
      { new: true, runValidators: true }
    );

    if (!car) {
      return res.status(404).json({
        status: 'error',
        message: 'Car not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Book now token count updated successfully',
      body: {
        car: {
          _id: car._id,
          bookNowTokenAvailable: car.bookNowTokenAvailable
        }
      }
    });
  } catch (error) {
    logger(`Error updating bookNowTokenAvailable: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update book now token count',
      error: error.message
    });
  }
};

module.exports = {
  createCar,
  getCars,
  getCarById,
  updateCar,
  updateBookNowTokenCount,
  deleteCar,
  getPublicCars,
  getPublicCarById
};