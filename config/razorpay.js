const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZOR_PAY_KEY_ID,
  key_secret: process.env.RAZOR_PAY_SECRET,
});

// Add some debugging
console.log('Razorpay initialized with:', {
  keyId: process.env.RAZOR_PAY_KEY_ID,
  hasSecret: !!process.env.RAZOR_PAY_SECRET,
  isTestMode: process.env.RAZOR_PAY_KEY_ID?.startsWith('rzp_test_')
});

module.exports = razorpay;
