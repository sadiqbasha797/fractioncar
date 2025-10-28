const User = require('../models/User');
const Car = require('../models/Car');
const Booking = require('../models/booking');
const AMC = require('../models/amc');
const Ticket = require('../models/Ticket');
const Token = require('../models/token');
const BookNowToken = require('../models/bookNowToken');
const Contract = require('../models/contract');
const ContactForm = require('../models/ContactForm');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());


    // Execute all count queries in parallel
    const [
      totalCars, activeCars, pendingCars, carsThisMonth,
      totalUsers, verifiedUsers, kycApprovedUsers, usersThisMonth,
      totalBookings, activeBookings, completedBookings, bookingsThisMonth, bookingsThisWeek,
      totalAmcs, activeAmcs, expiredAmcs, amcsThisMonth,
      totalTickets, activeTickets, expiredTickets, ticketsThisWeek,
      totalTokens, tokensThisMonth,
      totalBookNowTokens, bookNowTokensThisMonth,
      totalContracts, activeContracts, contractsThisMonth,
      totalContactForms, unreadContactForms
    ] = await Promise.all([
      Car.countDocuments(),
      Car.countDocuments({ status: 'active' }),
      Car.countDocuments({ status: 'pending' }),
      Car.countDocuments({ createdAt: { $gte: startOfMonth } }),
      
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ kycStatus: 'approved' }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'active' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
      
      AMC.countDocuments(),
      AMC.countDocuments({ status: 'active' }),
      AMC.countDocuments({ status: 'expired' }),
      AMC.countDocuments({ createdAt: { $gte: startOfMonth } }),
      
      Ticket.countDocuments(),
      Ticket.countDocuments({ ticketstatus: 'active' }),
      Ticket.countDocuments({ ticketstatus: { $in: ['expired', 'cancelled'] } }),
      Ticket.countDocuments({ createdAt: { $gte: startOfWeek } }),
      
      Token.countDocuments(),
      Token.countDocuments({ createdAt: { $gte: startOfMonth } }),
      
      BookNowToken.countDocuments(),
      BookNowToken.countDocuments({ createdAt: { $gte: startOfMonth } }),
      
      Contract.countDocuments(),
      Contract.countDocuments({ status: 'active' }),
      Contract.countDocuments({ createdAt: { $gte: startOfMonth } }),
      
      ContactForm.countDocuments(),
      ContactForm.countDocuments({ status: 'pending' })
    ]);


    // Execute all revenue queries in parallel
    const [ticketRevenue, amcRevenue, tokenRevenue, bookNowTokenRevenue] = await Promise.all([
      Ticket.aggregate([
        { $group: { _id: null, total: { $sum: '$pricepaid' } } }
      ]),
      AMC.aggregate([
        { $unwind: '$amcamount' },
        { $match: { 'amcamount.paid': true } },
        { $group: { _id: null, total: { $sum: '$amcamount.amount' } } }
      ]),
      Token.aggregate([
        { $group: { _id: null, total: { $sum: '$amountpaid' } } }
      ]),
      BookNowToken.aggregate([
        { $group: { _id: null, total: { $sum: '$amountpaid' } } }
      ])
    ]);


    const totalRevenue = (ticketRevenue[0]?.total || 0) + 
                        (amcRevenue[0]?.total || 0) + 
                        (tokenRevenue[0]?.total || 0) + 
                        (bookNowTokenRevenue[0]?.total || 0);

    // Execute recent activity queries in parallel
    const [recentBookings, recentTickets] = await Promise.all([
      Booking.find()
        .populate('userid', 'name email')
        .populate('carid', 'carname brand')
        .sort({ createdAt: -1 })
        .limit(5),
      Ticket.find()
        .populate('userid', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Transform tickets to shares format for frontend compatibility
    const recentShares = recentTickets.map(ticket => ({
      _id: ticket._id,
      userid: ticket.userid,
      sharecustomid: ticket.ticketcustomid,
      shareprice: ticket.ticketprice,
      pricepaid: ticket.pricepaid,
      pendingamount: ticket.pendingamount,
      sharestatus: ticket.ticketstatus,
      comments: ticket.comments,
      createdAt: ticket.createdAt || ticket.createdate
    }));


    res.json({
      success: true,
      data: {
        overview: {
          totalCars,
          activeCars,
          pendingCars,
          carsThisMonth,
          totalUsers,
          verifiedUsers,
          kycApprovedUsers,
          usersThisMonth,
          totalBookings,
          activeBookings,
          completedBookings,
          bookingsThisMonth,
          bookingsThisWeek,
          totalAmcs,
          activeAmcs,
          expiredAmcs,
          amcsThisMonth,
          totalTickets,
          activeTickets,
          expiredTickets,
          ticketsThisWeek,
          // Map tickets to shares (they are the same concept)
          totalShares: totalTickets,
          activeShares: activeTickets,
          expiredShares: expiredTickets,
          sharesThisWeek: ticketsThisWeek,
          totalTokens,
          tokensThisMonth,
          totalBookNowTokens,
          bookNowTokensThisMonth,
          totalContracts,
          activeContracts,
          contractsThisMonth,
          totalContactForms,
          unreadContactForms,
          totalRevenue
        },
        revenue: {
          total: totalRevenue,
          breakdown: {
            tickets: ticketRevenue[0]?.total || 0,
            shares: ticketRevenue[0]?.total || 0, // Map tickets to shares
            amc: amcRevenue[0]?.total || 0,
            tokens: tokenRevenue[0]?.total || 0,
            bookNowTokens: bookNowTokenRevenue[0]?.total || 0
          },
          monthlyTrend: {
            bookings: [],
            amc: []
          }
        },
        recentActivity: {
          bookings: recentBookings,
          tickets: recentTickets,
          shares: recentShares // Use transformed shares data
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get car distribution by brand
const getCarDistribution = async (req, res) => {
  try {
    const carDistribution = await Car.aggregate([
      {
        $group: {
          _id: '$brandname',  // Changed from '$brand' to '$brandname' to match the schema
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: carDistribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch car distribution',
      error: error.message
    });
  }
};

// Get booking trends (daily for the last 30 days)
const getBookingTrends = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookingTrends = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: bookingTrends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking trends',
      error: error.message
    });
  }
};

// Get top performing cars
const getTopPerformingCars = async (req, res) => {
  try {
    const topCars = await Booking.aggregate([
      {
        $group: {
          _id: '$carid',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'cars',
          localField: '_id',
          foreignField: '_id',
          as: 'car'
        }
      },
      { $unwind: '$car' },
      {
        $project: {
          carname: '$car.carname',
          brand: '$car.brandname',  // Changed from '$car.brand' to '$car.brandname'
          totalBookings: 1,
          totalRevenue: 1,
          image: { $arrayElemAt: ['$car.images', 0] }
        }
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: topCars
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top performing cars',
      error: error.message
    });
  }
};

// Get user growth data (monthly for the last 6 months)
const getUserGrowth = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format the data for the frontend
    const formattedData = userGrowth.map(item => ({
      date: `${item._id.year}-${item._id.month}`,
      count: item.count
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user growth data',
      error: error.message
    });
  }
};

// Get ticket status distribution
const getTicketStatusDistribution = async (req, res) => {
  try {
    const ticketStatus = await Ticket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Format the data for the frontend
    const formattedData = ticketStatus.map(item => ({
      status: item._id,
      count: item.count
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket status distribution',
      error: error.message
    });
  }
};

// Get revenue vs bookings correlation data
const getRevenueVsBookings = async (req, res) => {
  try {
    const revenueVsBookings = await Booking.aggregate([
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    // For a more detailed correlation, we could group by month or car
    // For now, we'll return a simple data point
    const data = revenueVsBookings.length > 0 ? 
      [{ bookings: revenueVsBookings[0].totalBookings, revenue: revenueVsBookings[0].totalRevenue }] : 
      [];

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue vs bookings data',
      error: error.message
    });
  }
};

// Get contract status distribution
const getContractStatusDistribution = async (req, res) => {
  try {
    const contractStatus = await Contract.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Format the data for the frontend
    const formattedData = contractStatus.map(item => ({
      status: item._id,
      count: item.count
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contract status distribution',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getCarDistribution,
  getBookingTrends,
  getTopPerformingCars,
  getUserGrowth,
  getTicketStatusDistribution,
  getRevenueVsBookings,
  getContractStatusDistribution
};