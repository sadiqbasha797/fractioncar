
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const CronService = require('./utils/cronService');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:4200', // Angular default port for development
    'http://localhost:3200', // Additional development port
    'https://fraction.projexino.com', // Production frontend URL
    'https://app.projexino.com', // Production frontend URL
    'https://www.fractioncar.com', // Production frontend URL
    'https://fractioncar.com', // Production frontend URL
    'https://fractionadmin.projexino.com', // Production frontend URL
    'https://fraction2.projexino.com', // Production frontend URL
    'https://fractionbackend.projexino.com' // Production backend URL (for self-referencing)
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Connect to database
connectDB();

// Basic route for health check
app.get('/', (req, res) => {
  res.json({ message: 'Server is running', status: 'OK' });
});

// Serve test page
app.get('/test-razorpay', (req, res) => {
  res.sendFile(__dirname + '/test-razorpay.html');
});

// Get Razorpay Key ID for frontend
app.get('/api/razorpay-key', (req, res) => {
  res.json({ key: process.env.RAZOR_PAY_KEY_ID });
});

// Authentication routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Car routes
const carRoutes = require('./routes/carRoutes');
app.use('/api/cars', carRoutes);

// Pincode routes
const pincodeRoutes = require('./routes/pincodeRoutes');
app.use('/api/pincode', pincodeRoutes);

// Ticket routes
const ticketRoutes = require('./routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

// AMC routes
const amcRoutes = require('./routes/amcRoutes');
app.use('/api/amcs', amcRoutes);

// Booking routes
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

// Blocked Date routes
const blockedDateRoutes = require('./routes/blockedDateRoutes');
app.use('/api/blocked-dates', blockedDateRoutes);

// Contract routes
const contractRoutes = require('./routes/contractRoutes');
app.use('/api/contracts', contractRoutes);

// Token routes
const tokenRoutes = require('./routes/tokenRoutes');
app.use('/api/tokens', tokenRoutes);

// Book Now Token routes
const bookNowTokenRoutes = require('./routes/bookNowTokenRoutes');
app.use('/api/book-now-tokens', bookNowTokenRoutes);

// Home routes (includes Hero Content, Brands, Simple Steps, and FAQs)
const homeRoutes = require('./routes/homeRoutes');
app.use('/api/home', homeRoutes);

// FAQ Category routes
const faqCategoryRoutes = require('./routes/faqCategoryRoutes');
app.use('/api/faq-categories', faqCategoryRoutes);

// KYC routes
const kycRoutes = require('./routes/kycRoutes');
app.use('/api/kyc', kycRoutes);

// User routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Contact routes
const contactRoutes = require('./routes/contactRoutes');
app.use('/api/contact', contactRoutes);

// Payment routes
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

// Notification routes
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// AMC Reminder routes
const amcReminderRoutes = require('./routes/amcReminderRoutes');
app.use('/api/amc-reminders', amcReminderRoutes);

// KYC Reminder routes
const kycReminderRoutes = require('./routes/kycReminderRoutes');
app.use('/api/kyc-reminders', kycReminderRoutes);

// Dashboard routes
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

// Admin management routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admins', adminRoutes);

// Shared Member routes
const sharedMemberRoutes = require('./routes/sharedMemberRoutes');
app.use('/api/shared-members', sharedMemberRoutes);

// About routes
const aboutRoutes = require('./routes/aboutRoutes');
app.use('/api/about', aboutRoutes);

const PORT = process.env.PORT || 2000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start cron jobs for scheduled tasks
  CronService.startCronJobs();
});
//npm install jsonwebtoken bcrypt mongoose express cors dotenv multer cloudinary node-cron nodemailer razorpay axios