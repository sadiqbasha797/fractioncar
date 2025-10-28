const Car = require('../models/Car');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { deleteImagesFromCloudinary } = require('../utils/imageUtils');
const BookingAvailabilityService = require('../utils/bookingAvailabilityService');

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

    // Trim string fields to prevent duplicate entries
    const trimmedData = {
      carname: carname?.trim(),
      color: color?.trim(),
      milege: milege?.trim(),
      brandname: brandname?.trim(),
      location: location?.trim(),
      pincode: pincode?.trim(),
      description: description?.trim()
    };

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

    // Validate maximum limits for car creation
    const validationErrors = [];
    
    if (bookNowTokenAvailable !== undefined && (bookNowTokenAvailable > 12 || bookNowTokenAvailable < 0)) {
      validationErrors.push('Book now tokens must be between 0 and 12');
    }
    
    if (totaltickets !== undefined && (totaltickets > 12 || totaltickets < 1)) {
      validationErrors.push('Total shares must be between 1 and 12');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: validationErrors.join('. ')
      });
    }

    const car = new Car({
      carname: trimmedData.carname,
      color: trimmedData.color,
      milege: trimmedData.milege,
      seating,
      features,
      brandname: trimmedData.brandname,
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
      location: trimmedData.location,
      pincode: trimmedData.pincode,
      description: trimmedData.description,
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
      description,
      stopBookings
    } = req.body;

    // Trim string fields to prevent duplicate entries
    const trimmedData = {
      carname: carname?.trim(),
      color: color?.trim(),
      milege: milege?.trim(),
      brandname: brandname?.trim(),
      location: location?.trim(),
      pincode: pincode?.trim(),
      description: description?.trim()
    };

    // Convert stopBookings string to boolean if provided
    const stopBookingsValue = stopBookings !== undefined ? 
      (stopBookings === 'true' || stopBookings === true) : undefined;

    // Check if both tokensavailble and bookNowTokenAvailable are 0
    // If so, automatically set stopBookings to true
    const shouldAutoStopBookings = (tokensavailble === 0 || tokensavailble === '0') && 
                                  (bookNowTokenAvailable === 0 || bookNowTokenAvailable === '0');
    
    // If trying to enable bookings but no availability, prevent it
    if (stopBookingsValue === false && shouldAutoStopBookings) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Cannot enable bookings: Both waitlist and book now tokens are filled. Add vacancy to open bookings.'
      });
    }

    // Validate maximum limits
    const validationErrors = [];
    
    if (tokensavailble !== undefined && (tokensavailble > 20 || tokensavailble < 0)) {
      validationErrors.push('Waitlist tokens must be between 0 and 20');
    }
    
    if (bookNowTokenAvailable !== undefined && (bookNowTokenAvailable > 12 || bookNowTokenAvailable < 0)) {
      validationErrors.push('Book now tokens must be between 0 and 12');
    }
    
    if (totaltickets !== undefined && (totaltickets > 12 || totaltickets < 1)) {
      validationErrors.push('Total shares must be between 1 and 12');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: validationErrors.join('. ')
      });
    }

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

    // Handle image updates
    let images = car.images || [];
    let imagesToDelete = [];
    
    // Check if we have existing images data (JSON string) in the request body
    if (req.body.images && typeof req.body.images === 'string') {
      try {
        const newImages = JSON.parse(req.body.images);
        
        // Find images that were removed (exist in old array but not in new array)
        const oldImages = car.images || [];
        imagesToDelete = oldImages.filter(oldImage => !newImages.includes(oldImage));
        
        images = newImages;
      } catch (parseError) {
        logger(`Error parsing images array: ${parseError.message}`);
        // Keep existing images if parsing fails
      }
    }
    
    // Handle new image uploads if provided
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
    
    // Determine final stopBookings value
    let finalStopBookingsValue = stopBookingsValue;
    
    // If both tokens are 0, automatically stop bookings
    if (shouldAutoStopBookings) {
      finalStopBookingsValue = true;
    }

    const updatedCar = await Car.findByIdAndUpdate(
      req.params.id,
      {
        carname: trimmedData.carname,
        color: trimmedData.color,
        milege: trimmedData.milege,
        seating,
        features,
        brandname: trimmedData.brandname,
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
        location: trimmedData.location,
        pincode: trimmedData.pincode,
        description: trimmedData.description,
        stopBookings: finalStopBookingsValue
      },
      { new: true }
    );

    // Delete removed images from Cloudinary
    if (imagesToDelete.length > 0) {
      try {
        const deleteResults = await deleteImagesFromCloudinary(imagesToDelete);
        logger(`Image deletion results - Success: ${deleteResults.success.length}, Failed: ${deleteResults.failed.length}`);
      } catch (deleteError) {
        logger(`Error deleting images from Cloudinary: ${deleteError.message}`);
        // Don't fail the request if image deletion fails
      }
    }

    let message = 'Car updated successfully';
    if (shouldAutoStopBookings && stopBookingsValue !== true) {
      message = 'Car updated successfully. Bookings automatically stopped as both waitlist and book now tokens are filled.';
    }

    // Check if bookings should be stopped for this car (in case tokens were updated)
    try {
      await BookingAvailabilityService.stopBookingsIfNeeded(req.params.id);
    } catch (error) {
      logger(`Error checking booking availability after update: ${error.message}`);
      // Don't fail the request if this check fails
    }

    res.json({
      status: 'success',
      body: { car: updatedCar },
      message: message
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

    // Delete all car images from Cloudinary before deleting the car
    if (car.images && car.images.length > 0) {
      try {
        const deleteResults = await deleteImagesFromCloudinary(car.images);
        logger(`Car deletion - Image deletion results - Success: ${deleteResults.success.length}, Failed: ${deleteResults.failed.length}`);
      } catch (deleteError) {
        logger(`Error deleting car images from Cloudinary: ${deleteError.message}`);
        // Continue with car deletion even if image deletion fails
      }
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

    if (bookNowTokenAvailable === undefined || bookNowTokenAvailable < 0 || bookNowTokenAvailable > 12) {
      return res.status(400).json({
        status: 'error',
        message: 'bookNowTokenAvailable is required and must be between 0 and 12'
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

    // Check if bookings should be stopped for this car after token update
    try {
      await BookingAvailabilityService.stopBookingsIfNeeded(id);
    } catch (error) {
      logger(`Error checking booking availability after token update: ${error.message}`);
      // Don't fail the request if this check fails
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


// Get cars with stopBookings filter (Admin and SuperAdmin only)
const getCarsWithStopBookingsFilter = async (req, res) => {
  try {
    const { page = 1, limit = 10, stopBookings, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    // Filter by stopBookings status
    if (stopBookings !== undefined) {
      query.stopBookings = stopBookings === 'true';
    }
    
    // Filter by car status
    if (status) {
      query.status = status;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { carname: { $regex: search, $options: 'i' } },
        { brandname: { $regex: search, $options: 'i' } },
        { color: { $regex: search, $options: 'i' } }
      ];
    }

    const cars = await Car.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Car.countDocuments(query);

    res.json({
      status: 'success',
      body: { 
        cars,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      },
      message: 'Cars retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getCarsWithStopBookingsFilter: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Track car view (increment view count)
const trackCarView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Get user ID if authenticated

    const car = await Car.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }

    // Track user view for retargeting if user is authenticated
    if (userId) {
      try {
        const RetargetingNotificationService = require('../utils/retargetingNotificationService');
        await RetargetingNotificationService.trackCarView(userId, id);
      } catch (trackingError) {
        logger(`Error tracking user view: ${trackingError.message}`);
        // Don't fail the request if tracking fails
      }
    }

    res.json({
      status: 'success',
      body: { 
        car: {
          _id: car._id,
          viewCount: car.viewCount
        }
      },
      message: 'Car view tracked successfully'
    });
  } catch (error) {
    logger(`Error in trackCarView: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get most browsed cars
const getMostBrowsedCars = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const cars = await Car.find({ 
      status: { $ne: 'cancelled' }, // Exclude cancelled cars
      stopBookings: false // Only active cars
    })
      .sort({ viewCount: -1 })
      .limit(parseInt(limit))
      .select('carname brandname color milege seating features price fractionprice tokenprice amcperticket contractYears status ticketsavilble totaltickets tokensavailble bookNowTokenAvailable bookNowTokenPrice images location pincode description viewCount createdAt');

    res.json({
      status: 'success',
      body: { cars },
      message: 'Most browsed cars retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getMostBrowsedCars: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createCar,
  getCars,
  getCarById,
  updateCar,
  updateBookNowTokenCount,
  getCarsWithStopBookingsFilter,
  deleteCar,
  getPublicCars,
  getPublicCarById,
  trackCarView,
  getMostBrowsedCars
};