const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');

// Route for users to get their own tickets (requires user authentication)
router.get('/my-tickets', authMiddleware(['user', 'admin', 'superadmin']), ticketController.getUserTickets);

// All routes below require admin or superadmin authentication
router.use(authMiddleware(['admin', 'superadmin']));

// Create a new ticket
router.post('/', ticketController.createTicket);

// Get all tickets
router.get('/', ticketController.getTickets);

// Get a ticket by ID
router.get('/:id', ticketController.getTicketById);

// Update a ticket by ID
router.put('/:id', ticketController.updateTicket);

// Delete a ticket by ID
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;