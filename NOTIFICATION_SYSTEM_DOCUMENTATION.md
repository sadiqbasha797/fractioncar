# Notification System Documentation

## Overview
The notification system provides real-time notifications for users, admins, and super admins across the Fraction car sharing platform. It includes both in-app notifications and email notifications.

## Features

### User Notifications
- **Welcome Notification**: Sent when a user signs up
- **Book Now Token Created**: When a book now token is created for the user
- **Token Created (Waitlist)**: When a regular token is created, user joins waitlist
- **Ticket Created (Share)**: When a share ticket is created for the user
- **AMC Payment Done**: When AMC payment is completed
- **AMC Reminder**: Daily reminders when AMC is due within 30 days
- **Booking Done**: When a booking is confirmed
- **KYC Approved**: When KYC documents are approved
- **KYC Rejected**: When KYC documents are rejected

### Admin/Super Admin Notifications
- **User Joined Waitlist**: When a user purchases a token and joins waitlist
- **User Purchased Token**: When a user purchases a regular token
- **User Purchased Book Now Token**: When a user purchases a book now token
- **User Created Ticket**: When a user creates a share ticket
- **User Paid AMC**: When a user makes AMC payment
- **User Made Booking**: When a user makes a booking
- **User KYC Approved**: When a user's KYC is approved
- **User KYC Rejected**: When a user's KYC is rejected

## API Endpoints

### Notification Management
- `GET /api/notifications` - Get user notifications (with pagination)
- `GET /api/notifications/unread-count` - Get unread notification count
- `PATCH /api/notifications/:notificationId/read` - Mark notification as read
- `PATCH /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/:notificationId` - Delete a notification
- `GET /api/notifications/stats` - Get notification statistics (admin/superadmin only)

### AMC Reminder Management
- `POST /api/amc-reminders/trigger-check` - Manually trigger AMC reminder check
- `GET /api/amc-reminders/records-needing-reminders` - Get AMC records needing reminders
- `POST /api/amc-reminders/send-reminder/:amcId` - Send reminder for specific AMC

## Database Schema

### Notification Model
```javascript
{
  recipientId: ObjectId, // User/Admin/SuperAdmin ID
  recipientModel: String, // 'User', 'Admin', 'SuperAdmin'
  title: String, // Notification title
  message: String, // Notification message
  type: String, // Notification type (see enum values)
  relatedEntityId: ObjectId, // Related entity ID (optional)
  relatedEntityModel: String, // Related entity model (optional)
  metadata: Mixed, // Additional data
  isRead: Boolean, // Read status
  readAt: Date, // Read timestamp
  priority: String, // 'low', 'medium', 'high', 'urgent'
  expiresAt: Date, // Expiry date (30 days default)
  createdAt: Date,
  updatedAt: Date
}
```

## Notification Types

### User Notifications
- `welcome` - Welcome notification
- `booknow_token_created` - Book now token created
- `token_created` - Token created (waitlist context)
- `ticket_created` - Share ticket created
- `amc_payment_done` - AMC payment completed
- `amc_reminder` - AMC payment reminder
- `booking_done` - Booking confirmed
- `kyc_approved` - KYC approved
- `kyc_rejected` - KYC rejected

### Admin Notifications
- `user_joined_waitlist` - User joined waitlist
- `user_purchased_token` - User purchased token
- `user_purchased_booknow_token` - User purchased book now token
- `user_created_ticket` - User created share ticket
- `user_paid_amc` - User paid AMC
- `user_made_booking` - User made booking
- `user_kyc_approved` - User KYC approved
- `user_kyc_rejected` - User KYC rejected

## Priority Levels
- `low` - Welcome notifications
- `medium` - Regular transactions (tokens, bookings, etc.)
- `high` - KYC status changes, AMC reminders
- `urgent` - Critical system notifications

## Automated Features

### Daily AMC Reminders
- Runs daily at 9:00 AM IST
- Checks all AMC records for payments due within 30 days
- Sends reminder notifications to users
- Logs all reminder activities

### Notification Cleanup
- Runs daily at 2:00 AM IST
- Automatically removes expired notifications (30+ days old)
- Uses MongoDB TTL index for efficient cleanup

## Integration Points

### Controllers Updated
- `authController.js` - Welcome notifications on signup
- `kycController.js` - KYC approval/rejection notifications
- `tokenController.js` - Token creation notifications
- `bookNowTokenController.js` - Book now token notifications
- `ticketController.js` - Share ticket notifications
- `amcController.js` - AMC payment notifications
- `bookingController.js` - Booking notifications

### Services
- `NotificationService` - Core notification management
- `AMCReminderService` - AMC reminder functionality
- `CronService` - Scheduled task management

## Usage Examples

### Get User Notifications
```javascript
GET /api/notifications?page=1&limit=20&unreadOnly=false
```

### Mark Notification as Read
```javascript
PATCH /api/notifications/64a1b2c3d4e5f6789012345/read
```

### Trigger AMC Reminder Check
```javascript
POST /api/amc-reminders/trigger-check
```

## Error Handling
- All notification operations include proper error handling
- Failed notifications are logged but don't break main operations
- Graceful degradation when notification service is unavailable

## Security
- All notification endpoints require authentication
- Users can only access their own notifications
- Admin endpoints require admin/superadmin role
- Input validation on all endpoints

## Performance Considerations
- Database indexes for efficient queries
- Pagination for large notification lists
- TTL indexes for automatic cleanup
- Batch operations for admin notifications

## Monitoring
- Comprehensive logging for all notification activities
- Error tracking for failed notifications
- Performance metrics for notification delivery
- AMC reminder statistics

## Future Enhancements
- Push notifications for mobile apps
- Email notification preferences
- Notification templates customization
- Real-time WebSocket notifications
- Notification analytics dashboard
