const Ticket = require('../models/Ticket');
const Car = require('../models/Car');
const User = require('../models/User');
const logger = require('../utils/logger');
const NotificationService = require('../utils/notificationService');

// Create a new ticket
const createTicket = async (req, res) => {
  try {
    const {
      userid,
      carid,
      ticketcustomid,
      ticketprice,
      pricepaid,
      pendingamount,
      ticketbroughtdate,
      comments,
      paymentid,
      ticketstatus,
      resold
    } = req.body;

    // Fetch car details to get contractYears
    const car = await Car.findById(carid);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }

    // Calculate ticket expiry based on contractYears
    const broughtDate = new Date(ticketbroughtdate);
    const contractYears = car.contractYears || 5; // Default to 5 years if not set
    const expiryDate = new Date(broughtDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + contractYears);

    const ticket = new Ticket({
      userid,
      carid,
      ticketcustomid,
      ticketprice,
      pricepaid,
      pendingamount,
      ticketexpiry: expiryDate,
      ticketbroughtdate,
      comments,
      paymentid,
      ticketstatus,
      resold,
      createdby: req.user.id,
      createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'Admin'
    });

    await ticket.save();

    // Create notifications after successful ticket creation
    try {
      const user = await User.findById(userid);
      const car = await Car.findById(carid);
      
      if (user && car) {
        // User notification
        await NotificationService.createTicketNotification(user._id, ticket, car);
        
        // Admin notification
        await NotificationService.createUserCreatedTicketNotification(user, ticket, car);
        
        logger(`Notifications sent successfully for ticket creation: ${ticket._id}`);
      }
    } catch (notificationError) {
      logger(`Error creating ticket notifications: ${notificationError.message}`);
    }

    res.status(201).json({
      status: 'success',
      body: { ticket },
      message: 'Ticket created successfully'
    });
  } catch (error) {
    logger(`Error in createTicket: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all tickets
const getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('userid carid');
    res.json({
      status: 'success',
      body: { tickets },
      message: 'Tickets retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getTickets: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get a ticket by ID
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('userid carid');
    if (!ticket) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Ticket not found'
      });
    }
    res.json({
      status: 'success',
      body: { ticket },
      message: 'Ticket retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getTicketById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update a ticket by ID
const updateTicket = async (req, res) => {
  try {
    const {
      userid,
      carid,
      ticketcustomid,
      ticketprice,
      pricepaid,
      pendingamount,
      ticketbroughtdate,
      comments,
      paymentid,
      ticketstatus,
      resold
    } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Ticket not found'
      });
    }

    // Check if user is authorized to update this ticket
    if (ticket.createdby.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this ticket'
      });
    }

    // Calculate new expiry if carid or ticketbroughtdate is being updated
    let calculatedExpiry = ticket.ticketexpiry; // Keep existing expiry by default
    
    if (carid || ticketbroughtdate) {
      const carId = carid || ticket.carid;
      const broughtDate = ticketbroughtdate || ticket.ticketbroughtdate;
      
      const car = await Car.findById(carId);
      if (car) {
        const contractYears = car.contractYears || 5;
        const newBroughtDate = new Date(broughtDate);
        const newExpiryDate = new Date(newBroughtDate);
        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + contractYears);
        calculatedExpiry = newExpiryDate;
      }
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        userid,
        carid,
        ticketcustomid,
        ticketprice,
        pricepaid,
        pendingamount,
        ticketexpiry: calculatedExpiry,
        ticketbroughtdate,
        comments,
        paymentid,
        ticketstatus,
        resold
      },
      { new: true }
    ).populate('userid carid');

    res.json({
      status: 'success',
      body: { ticket: updatedTicket },
      message: 'Ticket updated successfully'
    });
  } catch (error) {
    logger(`Error in updateTicket: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete a ticket by ID
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Ticket not found'
      });
    }

    // Check if user is authorized to delete this ticket
    if (ticket.createdby.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to delete this ticket'
      });
    }

    await Ticket.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      body: {},
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteTicket: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get tickets for the authenticated user
const getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ userid: req.user.id })
      .populate('carid')
      .sort({ createdate: -1 });
    
    res.json({
      status: 'success',
      body: { tickets },
      message: 'User tickets retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getUserTickets: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getUserTickets
};