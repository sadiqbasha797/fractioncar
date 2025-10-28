const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { createTransporter } = require('../config/mail');
const logger = require('./logger');

// Helper function to check if user has email notifications enabled
const shouldSendEmail = (userDetails, notificationType) => {
  // If user doesn't have emailNotifications object, send email (backward compatibility)
  if (!userDetails.emailNotifications) {
    return true;
  }
  
  // Check if email notifications are globally enabled for the user
  if (userDetails.emailNotifications.enabled === false) {
    logger(`Email notifications disabled for user ${userDetails.email}`);
    return false;
  }
  
  // Check specific notification type if provided
  if (notificationType && userDetails.emailNotifications[notificationType] === false) {
    logger(`${notificationType} notifications disabled for user ${userDetails.email}`);
    return false;
  }
  
  return true;
};

// Helper function to read and process email templates
const readTemplate = (templateName) => {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    logger(`Error reading template ${templateName}: ${error.message}`);
    throw new Error(`Template ${templateName} not found`);
  }
};

// Helper function to replace placeholders in templates
const replacePlaceholders = (template, data) => {
  let processedTemplate = template;
  
  // Replace all {{placeholder}} with actual data
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    processedTemplate = processedTemplate.replace(placeholder, value || '');
  }
  
  return processedTemplate;
};

// Create contact form specific transporter
const createContactFormTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'contact-us@fractioncar.com',
      pass: 'svkr fjvh reja dxcd'
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Generic email sending function
const sendEmail = async (to, subject, htmlContent, textContent = null) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'FractionCar - Car Sharing',
        address: process.env.MAIL
      },
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const result = await transporter.sendMail(mailOptions);
    logger(`Email sent successfully to ${to}: ${result.messageId}`);
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    logger(`Error sending email to ${to}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

// Contact form specific email sending function
const sendContactFormEmail = async (to, subject, htmlContent, textContent = null) => {
  try {
    const transporter = createContactFormTransporter();
    
    const mailOptions = {
      from: {
        name: 'FractionCar - Contact Support',
        address: 'contact-us@fractioncar.com'
      },
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const result = await transporter.sendMail(mailOptions);
    logger(`Contact form email sent successfully to ${to}: ${result.messageId}`);
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    logger(`Error sending contact form email to ${to}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

// Welcome email for new user registration
const sendWelcomeEmail = async (userDetails) => {
  try {
    if (!shouldSendEmail(userDetails)) {
      return { success: true, skipped: true, message: 'Email notifications disabled for user' };
    }
    
    const template = readTemplate('welcome');
    
    const templateData = {
      userName: userDetails.name,
      userEmail: userDetails.email,
      registrationDate: new Date(userDetails.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      kycLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/kyc-verification`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '🎉 Welcome to Fraction - Your Car Sharing Journey Begins!',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending welcome email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// KYC approval email
const sendKycApprovedEmail = async (userDetails) => {
  try {
    if (!shouldSendEmail(userDetails, 'kyc')) {
      return { success: true, skipped: true, message: 'KYC notifications disabled for user' };
    }
    
    const template = readTemplate('kyc-approved');
    
    const templateData = {
      userName: userDetails.name,
      approvedBy: userDetails.kycApprovedBy?.name || 'Fraction Team',
      approvalDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '✅ KYC Approved - Start Booking Cars Now!',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending KYC approved email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// KYC rejection email
const sendKycRejectedEmail = async (userDetails, rejectionComments) => {
  try {
    if (!shouldSendEmail(userDetails, 'kyc')) {
      return { success: true, skipped: true, message: 'KYC notifications disabled for user' };
    }
    
    const template = readTemplate('kyc-rejected');
    
    const templateData = {
      userName: userDetails.name,
      rejectionDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      rejectionComments: rejectionComments || 'Please review and resubmit your documents.',
      kycResubmitLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/kyc-verification`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '⚠️ KYC Update Required - Action Needed',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending KYC rejected email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// KYC reminder email
const sendKycReminderEmail = async (userDetails, daysSinceRegistration) => {
  try {
    if (!shouldSendEmail(userDetails, 'kyc')) {
      return { success: true, skipped: true, message: 'KYC notifications disabled for user' };
    }
    
    const template = readTemplate('kyc-reminder');
    
    const templateData = {
      userName: userDetails.name,
      daysSinceRegistration: daysSinceRegistration,
      registrationDate: userDetails.createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      kycLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/kyc-verification`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '📋 Complete Your KYC Verification - Fraction',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending KYC reminder email: ${error.message}`);
    return { success: false, error: error.message };
  }
};


// Password reset email (if needed in future)
const sendPasswordResetEmail = async (userDetails, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>Dear ${userDetails.name},</p>
        <p>You have requested to reset your password. Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #7f8c8d; font-size: 14px;">Fraction Team<br>support@fraction.com</p>
      </div>
    `;
    
    return await sendEmail(
      userDetails.email,
      '🔐 Password Reset Request - Fraction',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending password reset email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Email verification email
const sendVerificationEmail = async (userDetails, verificationCode) => {
  try {
    const template = readTemplate('email-verification');
    
    const templateData = {
      userName: userDetails.name,
      verificationCode: verificationCode,
      verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/verify-email?code=${verificationCode}`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '📧 Verify Your Email - Fraction Car Account',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending verification email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Password reset email
const sendPasswordResetEmailWithCode = async (userDetails, resetCode) => {
  try {
    const template = readTemplate('password-reset');
    
    const now = new Date();
    const templateData = {
      userName: userDetails.name,
      resetCode: resetCode,
      resetLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?code=${resetCode}`,
      requestDate: now.toLocaleDateString('en-IN'),
      requestTime: now.toLocaleTimeString('en-IN')
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '🔐 Password Reset Code - Fraction',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending password reset email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Token purchase confirmation email
const sendTokenPurchaseConfirmationEmail = async (userDetails, tokenDetails, carDetails) => {
  try {
    if (!shouldSendEmail(userDetails, 'tokenPurchase')) {
      return { success: true, skipped: true, message: 'Token purchase notifications disabled for user' };
    }
    
    const template = readTemplate('token-purchase-confirmation');
    
    // Map car fields safely from schema
    const carName = carDetails?.carname || carDetails?.name || 'N/A';
    const carBrand = carDetails?.brandname || carDetails?.brand || 'N/A';
    const carYear = carDetails?.year || carDetails?.modelYear || 'N/A';
    const carLocation = carDetails?.location || 'N/A';

    const templateData = {
      userName: userDetails.name,
      tokenId: tokenDetails._id,
      customTokenId: tokenDetails.customtokenid,
      purchaseDate: new Date(tokenDetails.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      expiryDate: new Date(tokenDetails.expirydate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      status: tokenDetails.status,
      carName: carName,
      carBrand: carBrand,
      carYear: carYear,
      carLocation: carLocation,
      amountPaid: tokenDetails.amountpaid,
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '🎫 Token Purchase Confirmed - Fraction',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending token purchase confirmation email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Book now token purchase confirmation email
const sendBookNowTokenPurchaseConfirmationEmail = async (userDetails, tokenDetails, carDetails) => {
  try {
    if (!shouldSendEmail(userDetails, 'bookNowToken')) {
      return { success: true, skipped: true, message: 'Book now token notifications disabled for user' };
    }
    
    const template = readTemplate('booknow-token-purchase-confirmation');
    
    // Map car fields safely from schema
    const carName = carDetails?.carname || carDetails?.name || 'N/A';
    const carBrand = carDetails?.brandname || carDetails?.brand || 'N/A';
    const carYear = carDetails?.year || carDetails?.modelYear || 'N/A';
    const carLocation = carDetails?.location || 'N/A';

    const templateData = {
      userName: userDetails.name,
      tokenId: tokenDetails._id,
      customTokenId: tokenDetails.customtokenid,
      purchaseDate: new Date(tokenDetails.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      expiryDate: new Date(tokenDetails.expirydate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      status: tokenDetails.status,
      carName: carName,
      carBrand: carBrand,
      carYear: carYear,
      carLocation: carLocation,
      amountPaid: tokenDetails.amountpaid,
      bookingLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/cars/${carDetails._id}`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '🚀 Book Now Token Purchased - Fraction',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending book now token purchase confirmation email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// AMC payment confirmation email
const sendAMCPaymentConfirmationEmail = async (userDetails, amcDetails, carDetails) => {
  try {
    if (!shouldSendEmail(userDetails, 'amcPayment')) {
      return { success: true, skipped: true, message: 'AMC payment notifications disabled for user' };
    }
    
    const template = readTemplate('amc-payment-confirmation');
    
    // Calculate total amount from all AMC years
    const totalAmount = amcDetails.amcamount.reduce((sum, year) => sum + year.amount, 0);
    
    // Format AMC years for template
    const amcYearsHtml = amcDetails.amcamount.map(year => 
      `<div class="year-details">
        <p><strong>Year ${year.year}:</strong> ₹${year.amount} - <span style="color: #27ae60;">✓ Paid on ${new Date(year.paiddate || new Date()).toLocaleDateString('en-IN')}</span></p>
      </div>`
    ).join('');
    
    const templateData = {
      userName: userDetails.name,
      amcId: amcDetails._id,
      paymentDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'Paid',
      ticketId: amcDetails.ticketid,
      carName: carDetails.name,
      carBrand: carDetails.brand,
      carYear: carDetails.year,
      carRegistration: carDetails.registrationNumber || 'N/A',
      totalAmount: totalAmount,
      amcYears: amcYearsHtml,
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '🔧 AMC Payment Confirmed - Fraction',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending AMC payment confirmation email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Superadmin notification for token purchase
const sendSuperAdminTokenPurchaseNotification = async (userDetails, tokenDetails, carDetails) => {
  try {
    const template = readTemplate('superadmin-token-purchase-notification');
    
    const templateData = {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userPhone: userDetails.phone || 'N/A',
      userId: userDetails._id,
      purchaseDate: new Date(tokenDetails.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      tokenId: tokenDetails._id,
      customTokenId: tokenDetails.customtokenid,
      status: tokenDetails.status,
      expiryDate: new Date(tokenDetails.expirydate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      carName: carDetails.name,
      carBrand: carDetails.brand,
      carYear: carDetails.year,
      carLocation: carDetails.location,
      carId: carDetails._id,
      amountPaid: tokenDetails.amountpaid,
      adminDashboardLink: `${process.env.ADMIN_URL || 'http://localhost:4200/admin'}/tokens`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    // Get superadmin email from environment or use a default
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'admin@fraction.com';
    
    return await sendEmail(
      superAdminEmail,
      '🎫 New Token Purchase - Admin Notification',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending superadmin token purchase notification: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Superadmin notification for book now token purchase
const sendSuperAdminBookNowTokenPurchaseNotification = async (userDetails, tokenDetails, carDetails) => {
  try {
    const template = readTemplate('superadmin-booknow-token-purchase-notification');
    
    const templateData = {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userPhone: userDetails.phone || 'N/A',
      userId: userDetails._id,
      purchaseDate: new Date(tokenDetails.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      tokenId: tokenDetails._id,
      customTokenId: tokenDetails.customtokenid,
      status: tokenDetails.status,
      expiryDate: new Date(tokenDetails.expirydate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      carName: carDetails.name,
      carBrand: carDetails.brand,
      carYear: carDetails.year,
      carLocation: carDetails.location,
      carId: carDetails._id,
      amountPaid: tokenDetails.amountpaid,
      adminDashboardLink: `${process.env.ADMIN_URL || 'http://localhost:4200/admin'}/booknow-tokens`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    // Get superadmin email from environment or use a default
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'admin@fraction.com';
    
    return await sendEmail(
      superAdminEmail,
      '🚀 New Book Now Token Purchase - Admin Notification',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending superadmin book now token purchase notification: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Superadmin notification for AMC payment
const sendSuperAdminAMCPaymentNotification = async (userDetails, amcDetails, carDetails) => {
  try {
    const template = readTemplate('superadmin-amc-payment-notification');
    
    // Calculate total amount from all AMC years
    const totalAmount = amcDetails.amcamount.reduce((sum, year) => sum + year.amount, 0);
    
    // Format AMC years for template
    const amcYearsHtml = amcDetails.amcamount.map(year => 
      `<div class="year-details">
        <p><strong>Year ${year.year}:</strong> ₹${year.amount} - <span style="color: #27ae60;">✓ Paid on ${new Date(year.paiddate || new Date()).toLocaleDateString('en-IN')}</span></p>
      </div>`
    ).join('');
    
    const templateData = {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userPhone: userDetails.phone || 'N/A',
      userId: userDetails._id,
      paymentDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      amcId: amcDetails._id,
      ticketId: amcDetails.ticketid,
      status: 'Paid',
      paymentMethod: 'Online Payment',
      carName: carDetails.name,
      carBrand: carDetails.brand,
      carYear: carDetails.year,
      carRegistration: carDetails.registrationNumber || 'N/A',
      carId: carDetails._id,
      totalAmount: totalAmount,
      amcYears: amcYearsHtml,
      adminDashboardLink: `${process.env.ADMIN_URL || 'http://localhost:4200/admin'}/amc`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    // Get superadmin email from environment or use a default
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'admin@fraction.com';
    
    return await sendEmail(
      superAdminEmail,
      '🔧 New AMC Payment - Admin Notification',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending superadmin AMC payment notification: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Booking confirmation email for user
const sendBookingConfirmationEmail = async (userDetails, bookingDetails, carDetails) => {
  try {
    if (!shouldSendEmail(userDetails, 'booking')) {
      return { success: true, skipped: true, message: 'Booking notifications disabled for user' };
    }
    
    const template = readTemplate('booking-confirmation-user');
    
    // Calculate duration
    const startDate = new Date(bookingDetails.bookingFrom);
    const endDate = new Date(bookingDetails.bookingTo);
    const durationMs = endDate - startDate;
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    const duration = durationDays === 1 ? '1 day' : `${durationDays} days`;
    
    // Map car fields safely from schema
    const carName = carDetails?.carname || carDetails?.name || 'N/A';
    const carBrand = carDetails?.brandname || carDetails?.brand || 'N/A';
    const carYear = carDetails?.year || carDetails?.modelYear || 'N/A';
    const carLocation = carDetails?.location || 'N/A';
    
    const templateData = {
      userName: userDetails.name,
      bookingId: bookingDetails._id,
      bookingFrom: startDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }),
      bookingTo: endDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }),
      duration: duration,
      bookingDate: new Date(bookingDetails.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      bookingStatus: bookingDetails.status,
      comments: bookingDetails.comments || '',
      carName: carName,
      carBrand: carBrand,
      carYear: carYear,
      carLocation: carLocation,
      bookingDetailsLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/bookings/${bookingDetails._id}`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '🚗 Booking Confirmed - Fraction',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending booking confirmation email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Superadmin notification for booking
const sendSuperAdminBookingNotification = async (userDetails, bookingDetails, carDetails) => {
  try {
    const template = readTemplate('superadmin-booking-notification');
    
    // Calculate duration
    const startDate = new Date(bookingDetails.bookingFrom);
    const endDate = new Date(bookingDetails.bookingTo);
    const durationMs = endDate - startDate;
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    const duration = durationDays === 1 ? '1 day' : `${durationDays} days`;
    
    const templateData = {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userPhone: userDetails.phone || 'N/A',
      userId: userDetails._id,
      bookingId: bookingDetails._id,
      bookingFrom: startDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }),
      bookingTo: endDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }),
      duration: duration,
      bookingDate: new Date(bookingDetails.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      bookingStatus: bookingDetails.status,
      comments: bookingDetails.comments || '',
      carName: carDetails.name,
      carBrand: carDetails.brand,
      carYear: carDetails.year,
      carLocation: carDetails.location,
      carId: carDetails._id,
      adminDashboardLink: `${process.env.ADMIN_URL || 'http://localhost:4200/admin'}/bookings`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    // Get superadmin email from environment or use a default
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'admin@fraction.com';
    
    return await sendEmail(
      superAdminEmail,
      '🚗 New Booking Received - Admin Notification',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending superadmin booking notification: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Send refund initiated notification
const sendRefundInitiated = async (to, data) => {
  try {
    if (data.userDetails && !shouldSendEmail(data.userDetails, 'refund')) {
      return { success: true, skipped: true, message: 'Refund notifications disabled for user' };
    }
    
    const template = readTemplate('refund-initiated');
    const htmlContent = replacePlaceholders(template, data);
    
    return await sendEmail(
      to,
      'Refund Initiated - FractionCars',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending refund initiated email: ${error.message}`);
    throw error;
  }
};

// Send refund processed notification
const sendRefundProcessed = async (to, data) => {
  try {
    if (data.userDetails && !shouldSendEmail(data.userDetails, 'refund')) {
      return { success: true, skipped: true, message: 'Refund notifications disabled for user' };
    }
    
    const template = readTemplate('refund-processed');
    const htmlContent = replacePlaceholders(template, data);
    
    return await sendEmail(
      to,
      'Refund Processed - FractionCars',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending refund processed email: ${error.message}`);
    throw error;
  }
};

// Send refund successful notification
const sendRefundSuccessful = async (to, data) => {
  try {
    if (data.userDetails && !shouldSendEmail(data.userDetails, 'refund')) {
      return { success: true, skipped: true, message: 'Refund notifications disabled for user' };
    }
    
    const template = readTemplate('refund-successful');
    const htmlContent = replacePlaceholders(template, data);
    
    return await sendEmail(
      to,
      'Refund Successful - FractionCars',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending refund successful email: ${error.message}`);
    throw error;
  }
};

// Generic refund notification sender
const sendRefundNotification = async (to, data) => {
  try {
    const { status } = data;
    
    switch (status) {
      case 'initiated':
        return await sendRefundInitiated(to, data);
      case 'processed':
        return await sendRefundProcessed(to, data);
      case 'successful':
        return await sendRefundSuccessful(to, data);
      default:
        throw new Error(`Unknown refund status: ${status}`);
    }
  } catch (error) {
    logger(`Error sending refund notification: ${error.message}`);
    throw error;
  }
};

// Test email function
const sendTestEmail = async (to) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #27ae60;">✅ Email Configuration Test</h2>
        <p>Congratulations! Your email configuration is working correctly.</p>
        <p>This is a test email sent from your Fraction application.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN')}</p>
        <hr style="margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 14px;">Fraction - Car Sharing Platform</p>
      </div>
    `;
    
    return await sendEmail(
      to,
      '✅ Email Configuration Test - Fraction',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending test email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Shared Member submission notification for admins
const sendSharedMemberSubmissionNotification = async (adminDetails, sharedMemberDetails, submittedByDetails) => {
  try {
    const template = readTemplate('shared-member-submission-notification');
    
    const templateData = {
      adminName: adminDetails.name,
      memberName: sharedMemberDetails.name,
      memberEmail: sharedMemberDetails.email,
      memberMobile: sharedMemberDetails.mobileNumber,
      memberAadhar: sharedMemberDetails.aadharNumber,
      memberPan: sharedMemberDetails.panNumber,
      submittedBy: submittedByDetails.name || submittedByDetails.email,
      submissionDate: new Date(sharedMemberDetails.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      documentCount: sharedMemberDetails.kycDocuments ? sharedMemberDetails.kycDocuments.length : 0,
      reviewLink: `${process.env.ADMIN_FRONTEND_URL || 'http://localhost:4200'}/shared-members/${sharedMemberDetails._id}`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      adminDetails.email,
      '🔔 New Shared Member Submission - Action Required',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending shared member submission notification: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Shared Member approved notification for user
const sendSharedMemberApprovedNotification = async (userDetails, sharedMemberDetails, approvedByDetails) => {
  try {
    if (!shouldSendEmail(userDetails, 'sharedMember')) {
      return { success: true, skipped: true, message: 'Shared member notifications disabled for user' };
    }
    
    const template = readTemplate('shared-member-approved-notification');
    
    const templateData = {
      userName: userDetails.name,
      memberName: sharedMemberDetails.name,
      memberEmail: sharedMemberDetails.email,
      memberMobile: sharedMemberDetails.mobileNumber,
      approvedBy: approvedByDetails.name || 'Fraction Team',
      approvalDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '✅ Shared Member Approved - Ready to Use!',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending shared member approved notification: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Shared Member rejected notification for user
const sendSharedMemberRejectedNotification = async (userDetails, sharedMemberDetails, rejectedByDetails, rejectionComments) => {
  try {
    if (!shouldSendEmail(userDetails, 'sharedMember')) {
      return { success: true, skipped: true, message: 'Shared member notifications disabled for user' };
    }
    
    const template = readTemplate('shared-member-rejected-notification');
    
    const templateData = {
      userName: userDetails.name,
      memberName: sharedMemberDetails.name,
      memberEmail: sharedMemberDetails.email,
      memberMobile: sharedMemberDetails.mobileNumber,
      rejectedBy: rejectedByDetails.name || 'Fraction Team',
      rejectionDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      rejectionComments: rejectionComments || 'Please review your submission and try again.',
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard`
    };
    
    const htmlContent = replacePlaceholders(template, templateData);
    
    return await sendEmail(
      userDetails.email,
      '❌ Shared Member Rejected - Action Required',
      htmlContent
    );
  } catch (error) {
    logger(`Error sending shared member rejected notification: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendContactFormEmail,
  sendWelcomeEmail,
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendKycReminderEmail,
  sendBookingConfirmationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendPasswordResetEmailWithCode,
  sendTokenPurchaseConfirmationEmail,
  sendBookNowTokenPurchaseConfirmationEmail,
  sendAMCPaymentConfirmationEmail,
  sendSuperAdminTokenPurchaseNotification,
  sendSuperAdminBookNowTokenPurchaseNotification,
  sendSuperAdminAMCPaymentNotification,
  sendSuperAdminBookingNotification,
  sendRefundInitiated,
  sendRefundProcessed,
  sendRefundSuccessful,
  sendRefundNotification,
  sendTestEmail,
  sendSharedMemberSubmissionNotification,
  sendSharedMemberApprovedNotification,
  sendSharedMemberRejectedNotification
};
