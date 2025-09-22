const AMC = require('../models/amc');
const User = require('../models/User');
const Car = require('../models/Car');
const NotificationService = require('./notificationService');
const logger = require('./logger');

class AMCPenaltyService {
  // Check for overdue AMC payments and apply 18% penalty
  static async checkAndApplyPenalties() {
    try {
      logger('Starting AMC penalty check...');
      
      // Get all AMC records
      const amcs = await AMC.find({})
        .populate('userid carid')
        .sort({ createdAt: -1 });

      const today = new Date();
      let penaltiesApplied = 0;
      let totalPenaltyAmount = 0;

      for (const amc of amcs) {
        if (!amc.userid || !amc.carid) continue;

        let amcUpdated = false;

        // Check each year's AMC payment
        for (let i = 0; i < amc.amcamount.length; i++) {
          const yearData = amc.amcamount[i];
          
          // Skip if already paid or no due date
          if (yearData.paid || !yearData.duedate) continue;

          const dueDate = new Date(yearData.duedate);
          
          // Check if payment is overdue
          if (dueDate < today) {
            const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
            
            // Calculate penalty only if not already calculated for this period
            if (yearData.penality === 0 || this.shouldRecalculatePenalty(yearData, today)) {
              const penaltyAmount = this.calculatePenalty(yearData.amount, daysOverdue);
              
              // Update penalty amount
              amc.amcamount[i].penality = penaltyAmount;
              amcUpdated = true;
              
              penaltiesApplied++;
              totalPenaltyAmount += penaltyAmount;
              
              logger(`Penalty applied for AMC ${amc._id}, Year ${yearData.year}: ₹${penaltyAmount} (${daysOverdue} days overdue)`);
              
              // Send penalty notifications
              try {
                // Send notification to user
                await NotificationService.createAMCPenaltyNotification(
                  amc.userid._id,
                  amc,
                  amc.carid,
                  yearData,
                  penaltyAmount,
                  daysOverdue
                );
                
                // Send notification to admins
                await NotificationService.createAdminAMCPenaltyNotification(
                  amc.userid,
                  amc,
                  amc.carid,
                  yearData,
                  penaltyAmount,
                  daysOverdue
                );
              } catch (notificationError) {
                logger(`Error sending penalty notification for AMC ${amc._id}: ${notificationError.message}`);
              }
            }
          }
        }

        // Save AMC if penalties were applied
        if (amcUpdated) {
          await amc.save();
        }
      }

      logger(`AMC penalty check completed. ${penaltiesApplied} penalties applied, total penalty amount: ₹${totalPenaltyAmount}`);
      return { 
        penaltiesApplied, 
        totalPenaltyAmount, 
        totalChecked: amcs.length 
      };
    } catch (error) {
      logger(`Error in AMC penalty check: ${error.message}`);
      throw error;
    }
  }

  // Calculate penalty amount based on 18% annual interest rate
  static calculatePenalty(principalAmount, daysOverdue) {
    // 18% annual interest rate = 18/365 = 0.0493% per day
    const dailyInterestRate = 0.18 / 365;
    const penaltyAmount = principalAmount * dailyInterestRate * daysOverdue;
    
    // Round to 2 decimal places
    return Math.round(penaltyAmount * 100) / 100;
  }

  // Check if penalty should be recalculated (e.g., if it's been more than a day)
  static shouldRecalculatePenalty(yearData, today) {
    if (!yearData.penality || yearData.penality === 0) return true;
    
    // Recalculate if it's been more than 1 day since last calculation
    const lastCalculation = yearData.lastPenaltyCalculation || new Date(yearData.duedate);
    const daysSinceLastCalculation = Math.ceil((today - lastCalculation) / (1000 * 60 * 60 * 24));
    
    return daysSinceLastCalculation >= 1;
  }

  // Get AMC records with overdue payments (for manual checking)
  static async getOverdueAMCRecords() {
    try {
      const today = new Date();
      
      const amcs = await AMC.find({})
        .populate('userid carid')
        .sort({ createdAt: -1 });

      const overdueRecords = [];

      for (const amc of amcs) {
        if (!amc.userid || !amc.carid) continue;

        const overdueYears = amc.amcamount.filter(year => 
          !year.paid && 
          year.duedate && 
          new Date(year.duedate) < today
        );

        if (overdueYears.length > 0) {
          const overdueYearsWithPenalty = overdueYears.map(year => {
            const daysOverdue = Math.ceil((today - new Date(year.duedate)) / (1000 * 60 * 60 * 24));
            const currentPenalty = year.penality || 0;
            const calculatedPenalty = this.calculatePenalty(year.amount, daysOverdue);
            
            return {
              year: year.year,
              amount: year.amount,
              dueDate: year.duedate,
              daysOverdue,
              currentPenalty,
              calculatedPenalty,
              totalAmount: year.amount + calculatedPenalty
            };
          });

          overdueRecords.push({
            amc,
            overdueYears: overdueYearsWithPenalty
          });
        }
      }

      return overdueRecords;
    } catch (error) {
      logger(`Error getting overdue AMC records: ${error.message}`);
      throw error;
    }
  }

  // Apply penalty for a specific AMC record
  static async applyPenaltyForAMC(amcId) {
    try {
      const amc = await AMC.findById(amcId)
        .populate('userid carid');

      if (!amc || !amc.userid || !amc.carid) {
        throw new Error('AMC record not found or missing user/car data');
      }

      const today = new Date();
      let penaltiesApplied = 0;
      let totalPenaltyAmount = 0;

      for (let i = 0; i < amc.amcamount.length; i++) {
        const yearData = amc.amcamount[i];
        
        if (yearData.paid || !yearData.duedate) continue;

        const dueDate = new Date(yearData.duedate);
        
        if (dueDate < today) {
          const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
          const penaltyAmount = this.calculatePenalty(yearData.amount, daysOverdue);
          
          amc.amcamount[i].penality = penaltyAmount;
          amc.amcamount[i].lastPenaltyCalculation = today;
          
          penaltiesApplied++;
          totalPenaltyAmount += penaltyAmount;
        }
      }

      if (penaltiesApplied > 0) {
        await amc.save();
      }

      return { penaltiesApplied, totalPenaltyAmount };
    } catch (error) {
      logger(`Error applying penalty for AMC ${amcId}: ${error.message}`);
      throw error;
    }
  }

  // Get total penalty amount for an AMC
  static getTotalPenaltyAmount(amc) {
    return amc.amcamount.reduce((total, year) => {
      return total + (year.penality || 0);
    }, 0);
  }

  // Get total amount including penalties for an AMC
  static getTotalAmountWithPenalties(amc) {
    return amc.amcamount.reduce((total, year) => {
      const yearTotal = year.amount + (year.penality || 0);
      return total + yearTotal;
    }, 0);
  }
}

module.exports = AMCPenaltyService;
