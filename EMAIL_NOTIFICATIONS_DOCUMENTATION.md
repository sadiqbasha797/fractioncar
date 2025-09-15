# Email Notifications System Documentation

## Overview

This document describes the email notification system implemented for the Fraction car sharing platform. The system automatically sends email notifications to users and superadmins when certain actions are performed.

## Features

### User Notifications
- **Token Purchase Confirmation**: Sent when a user purchases a waitlist token
- **Book Now Token Purchase Confirmation**: Sent when a user purchases a book now token
- **AMC Payment Confirmation**: Sent when a user makes an AMC (Annual Maintenance Charges) payment

### SuperAdmin Notifications
- **Token Purchase Notification**: Sent to superadmin when any user purchases a token
- **Book Now Token Purchase Notification**: Sent to superadmin when any user purchases a book now token
- **AMC Payment Notification**: Sent to superadmin when any user makes an AMC payment

## Email Templates

### User Templates

#### 1. Token Purchase Confirmation (`token-purchase-confirmation.html`)
- **Purpose**: Confirms waitlist token purchase
- **Color Scheme**: Green (#27ae60)
- **Key Information**:
  - Token ID and custom token ID
  - Purchase and expiry dates
  - Car details (model, brand, year, location)
  - Amount paid
  - Next steps for the user

#### 2. Book Now Token Purchase Confirmation (`booknow-token-purchase-confirmation.html`)
- **Purpose**: Confirms book now token purchase
- **Color Scheme**: Red (#e74c3c)
- **Key Information**:
  - Token ID and custom token ID
  - Purchase and expiry dates
  - Car details
  - Amount paid
  - Priority booking access information

#### 3. AMC Payment Confirmation (`amc-payment-confirmation.html`)
- **Purpose**: Confirms AMC payment
- **Color Scheme**: Purple (#8e44ad)
- **Key Information**:
  - AMC ID and ticket reference
  - Payment date
  - Car details
  - Total amount paid
  - AMC coverage details by year
  - Service inclusions

### SuperAdmin Templates

#### 1. Token Purchase Notification (`superadmin-token-purchase-notification.html`)
- **Purpose**: Notifies superadmin of token purchases
- **Color Scheme**: Green (#27ae60)
- **Key Information**:
  - Customer details (name, email, phone, user ID)
  - Token details
  - Car information
  - Amount received
  - Administrative actions required

#### 2. Book Now Token Purchase Notification (`superadmin-booknow-token-purchase-notification.html`)
- **Purpose**: Notifies superadmin of book now token purchases
- **Color Scheme**: Red (#e74c3c)
- **Key Information**:
  - Customer details
  - Token details
  - Car information
  - Amount received
  - High priority actions required

#### 3. AMC Payment Notification (`superadmin-amc-payment-notification.html`)
- **Purpose**: Notifies superadmin of AMC payments
- **Color Scheme**: Purple (#8e44ad)
- **Key Information**:
  - Customer details
  - AMC payment details
  - Car information
  - Total amount received
  - AMC coverage details
  - Administrative actions required

## Implementation Details

### Email Service Functions

The email service (`utils/emailService.js`) includes the following functions:

```javascript
// User confirmation emails
sendTokenPurchaseConfirmationEmail(userDetails, tokenDetails, carDetails)
sendBookNowTokenPurchaseConfirmationEmail(userDetails, tokenDetails, carDetails)
sendAMCPaymentConfirmationEmail(userDetails, amcDetails, carDetails)

// SuperAdmin notification emails
sendSuperAdminTokenPurchaseNotification(userDetails, tokenDetails, carDetails)
sendSuperAdminBookNowTokenPurchaseNotification(userDetails, tokenDetails, carDetails)
sendSuperAdminAMCPaymentNotification(userDetails, amcDetails, carDetails)
```

### Controller Integration

Emails are automatically sent from the following controller functions:

#### Token Controller (`controllers/tokenController.js`)
- `createToken()`: Sends user confirmation and superadmin notification

#### Book Now Token Controller (`controllers/bookNowTokenController.js`)
- `createBookNowToken()`: Sends user confirmation and superadmin notification

#### AMC Controller (`controllers/amcController.js`)
- `createAMC()`: Sends user confirmation and superadmin notification
- `updateAMCPaymentStatus()`: Sends emails when payment is marked as paid

### Error Handling

- Email sending errors are logged but do not fail the main operation
- Each email function returns a success/failure status
- Detailed error logging for debugging purposes

## Environment Variables

The following environment variables should be configured:

```env
# Email Configuration
MAIL=your-email@domain.com
MAIL_PASSWORD=your-email-password

# URLs
FRONTEND_URL=http://localhost:4200
ADMIN_URL=http://localhost:4200/admin

# SuperAdmin Email
SUPERADMIN_EMAIL=admin@fraction.com

# Test Email (for testing)
TEST_EMAIL=test@example.com
```

## Testing

### Manual Testing

Use the provided test script to verify email functionality:

```bash
# Set your test email
export TEST_EMAIL=your-email@example.com

# Run the test
node test-email-notifications.js
```

### Test Script Features

The test script (`test-email-notifications.js`) includes:
- Mock data generation for all scenarios
- Individual email function testing
- Success/failure reporting
- Database connection management

## Template Customization

### Placeholder Variables

All templates use the following placeholder system:
- `{{variableName}}`: Replaced with actual data
- Variables are automatically replaced using the `replacePlaceholders()` function

### Common Variables

- `{{userName}}`: User's full name
- `{{userEmail}}`: User's email address
- `{{userPhone}}`: User's phone number
- `{{carName}}`: Car model name
- `{{carBrand}}`: Car brand
- `{{carYear}}`: Car year
- `{{amountPaid}}`: Amount paid by user

### Styling

All templates use:
- Responsive design
- Professional color schemes
- Consistent branding
- Mobile-friendly layouts
- Clear call-to-action buttons

## Monitoring and Logging

### Log Messages

The system logs the following events:
- Successful email sending
- Email sending errors
- Template processing errors
- Database query errors

### Log Format

```
[Timestamp] Email sent successfully for token creation: 507f1f77bcf86cd799439011
[Timestamp] Error sending emails for token creation: SMTP connection failed
```

## Troubleshooting

### Common Issues

1. **Emails not being sent**
   - Check SMTP configuration in `config/mail.js`
   - Verify environment variables
   - Check email service logs

2. **Template not found errors**
   - Ensure template files exist in `templates/` directory
   - Check file naming conventions
   - Verify template file permissions

3. **Placeholder not replaced**
   - Check variable names in templates
   - Verify data is being passed correctly
   - Check for typos in placeholder names

### Debug Steps

1. Enable detailed logging
2. Test individual email functions
3. Check email service configuration
4. Verify database connections
5. Test with different email providers

## Future Enhancements

### Planned Features

1. **Email Templates Management**
   - Admin interface for template editing
   - Template versioning
   - A/B testing capabilities

2. **Advanced Notifications**
   - SMS notifications
   - Push notifications
   - WhatsApp integration

3. **Analytics**
   - Email open rates
   - Click tracking
   - Delivery statistics

4. **Customization**
   - User preference settings
   - Language selection
   - Brand customization

## Support

For issues or questions regarding the email notification system:

1. Check the logs for error messages
2. Verify environment configuration
3. Test with the provided test script
4. Contact the development team

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: Fraction Development Team
