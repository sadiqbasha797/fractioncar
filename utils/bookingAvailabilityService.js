const Car = require('../models/Car');
const logger = require('./logger');

class BookingAvailabilityService {
  /**
   * Check all cars and automatically stop bookings when both tokens are 0
   * @returns {Promise<Object>} Result object with statistics
   */
  static async checkAndStopBookings() {
    try {
      logger('Starting booking availability check...');
      
      // Find all cars that have bookings enabled but both tokens are 0
      const carsToUpdate = await Car.find({
        stopBookings: false,
        tokensavailble: 0,
        bookNowTokenAvailable: 0
      });

      if (carsToUpdate.length === 0) {
        logger('No cars found that need booking status updates');
        return {
          totalChecked: 0,
          bookingsStopped: 0,
          carsUpdated: []
        };
      }

      // Update all found cars to stop bookings
      const updatePromises = carsToUpdate.map(car => 
        Car.findByIdAndUpdate(
          car._id,
          { stopBookings: true },
          { new: true }
        )
      );

      const updatedCars = await Promise.all(updatePromises);

      logger(`Automatically stopped bookings for ${updatedCars.length} cars: ${updatedCars.map(car => car.carname).join(', ')}`);

      return {
        totalChecked: carsToUpdate.length,
        bookingsStopped: updatedCars.length,
        carsUpdated: updatedCars.map(car => ({
          _id: car._id,
          carname: car.carname,
          brandname: car.brandname
        }))
      };
    } catch (error) {
      logger(`Error in checkAndStopBookings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a specific car should have bookings stopped
   * @param {string} carId - The car ID to check
   * @returns {Promise<boolean>} True if bookings should be stopped
   */
  static async shouldStopBookings(carId) {
    try {
      const car = await Car.findById(carId);
      if (!car) {
        return false;
      }

      return car.tokensavailble === 0 && car.bookNowTokenAvailable === 0;
    } catch (error) {
      logger(`Error checking if bookings should be stopped for car ${carId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Automatically stop bookings for a specific car if both tokens are 0
   * @param {string} carId - The car ID to update
   * @returns {Promise<Object>} Result object
   */
  static async stopBookingsIfNeeded(carId) {
    try {
      const shouldStop = await this.shouldStopBookings(carId);
      
      if (shouldStop) {
        const updatedCar = await Car.findByIdAndUpdate(
          carId,
          { stopBookings: true },
          { new: true }
        );

        if (updatedCar) {
          logger(`Automatically stopped bookings for car: ${updatedCar.carname} (ID: ${carId})`);
          return {
            success: true,
            carUpdated: true,
            car: {
              _id: updatedCar._id,
              carname: updatedCar.carname,
              brandname: updatedCar.brandname
            }
          };
        }
      }

      return {
        success: true,
        carUpdated: false,
        message: 'Car does not need booking status update'
      };
    } catch (error) {
      logger(`Error stopping bookings for car ${carId}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = BookingAvailabilityService;
