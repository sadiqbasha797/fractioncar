const razorpay = require('./config/razorpay');
const Refund = require('./models/Refund');
const Token = require('./models/token');
const BookNowToken = require('./models/bookNowToken');

async function debugPaymentRefund(paymentId) {
  try {
    console.log('=== DEBUGGING PAYMENT REFUND ===');
    console.log('Payment ID:', paymentId);
    
    // 1. Check payment details from Razorpay
    console.log('\n1. Checking payment details from Razorpay...');
    const payment = await razorpay.payments.fetch(paymentId);
    console.log('Payment details:', {
      id: payment.id,
      amount: payment.amount,
      amount_refunded: payment.amount_refunded,
      status: payment.status,
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
      created_at: new Date(payment.created_at * 1000).toISOString(),
      notes: payment.notes
    });
    
    // 2. Check if payment is already fully refunded
    console.log('\n2. Checking refund status...');
    const isFullyRefunded = payment.amount_refunded >= payment.amount;
    console.log('Is fully refunded:', isFullyRefed);
    console.log('Available for refund:', payment.amount - payment.amount_refunded);
    
    // 3. Check local refund records
    console.log('\n3. Checking local refund records...');
    const localRefunds = await Refund.find({ originalPaymentId: paymentId });
    console.log('Local refund records:', localRefunds.length);
    localRefunds.forEach((refund, index) => {
      console.log(`Refund ${index + 1}:`, {
        refundId: refund.refundId,
        refundAmount: refund.refundAmount,
        refundStatus: refund.refundStatus,
        refundReason: refund.refundReason,
        createdAt: refund.createdAt
      });
    });
    
    // 4. Check transaction records
    console.log('\n4. Checking transaction records...');
    
    // Check Token records
    const tokenRecords = await Token.find({ razorpayPaymentId: paymentId });
    console.log('Token records:', tokenRecords.length);
    tokenRecords.forEach((token, index) => {
      console.log(`Token ${index + 1}:`, {
        id: token._id,
        customtokenid: token.customtokenid,
        status: token.status,
        amountpaid: token.amountpaid,
        refundDetails: token.refundDetails
      });
    });
    
    // Check BookNowToken records
    const bookNowTokenRecords = await BookNowToken.find({ razorpayPaymentId: paymentId });
    console.log('BookNowToken records:', bookNowTokenRecords.length);
    bookNowTokenRecords.forEach((token, index) => {
      console.log(`BookNowToken ${index + 1}:`, {
        id: token._id,
        customtokenid: token.customtokenid,
        status: token.status,
        amountpaid: token.amountpaid,
        refundDetails: token.refundDetails
      });
    });
    
    // 5. Check Razorpay refunds
    console.log('\n5. Checking Razorpay refunds...');
    try {
      const refunds = await razorpay.payments.fetchAllRefunds(paymentId);
      console.log('Razorpay refunds:', refunds.items.length);
      refunds.items.forEach((refund, index) => {
        console.log(`Razorpay Refund ${index + 1}:`, {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
          created_at: new Date(refund.created_at * 1000).toISOString(),
          notes: refund.notes
        });
      });
    } catch (error) {
      console.log('Error fetching Razorpay refunds:', error.message);
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Error debugging payment refund:', error);
  }
}

// Get payment ID from command line argument
const paymentId = process.argv[2];
if (!paymentId) {
  console.log('Usage: node debug-payment-refund.js <payment_id>');
  process.exit(1);
}

debugPaymentRefund(paymentId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
