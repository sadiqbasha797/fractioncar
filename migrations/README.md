# Database Migrations - Email Notification Preferences

## Overview

This directory contains migration scripts for adding email notification preferences to existing users in the database.

## Scripts

### 1. Migration Script
**File:** `add-email-notifications-to-users.js`

**Purpose:** Adds the `emailNotifications` field to all existing users who don't have it.

**What it does:**
- Finds all users without `emailNotifications` field
- Adds default preferences (all set to `true`)
- Processes users in batches for better performance
- Provides detailed progress and summary
- Verifies the migration was successful

**Usage:**
```bash
cd backend
node migrations/add-email-notifications-to-users.js
```

**Default Preferences:**
```javascript
{
  enabled: true,
  tokenPurchase: true,
  bookNowToken: true,
  amcPayment: true,
  booking: true,
  kyc: true,
  refund: true,
  sharedMember: true
}
```

### 2. Verification Script
**File:** `verify-email-notifications.js`

**Purpose:** Checks the status of email notification preferences across all users.

**What it does:**
- Counts total users
- Counts users with/without preferences
- Shows preference distribution
- Displays sample users
- Provides recommendations

**Usage:**
```bash
cd backend
node migrations/verify-email-notifications.js
```

**Output includes:**
- Total user count
- Users with/without preferences
- Master toggle statistics
- Individual notification type statistics
- Sample user data
- Migration status

### 3. Rollback Script
**File:** `rollback-email-notifications.js`

**Purpose:** Removes the `emailNotifications` field from all users (use with caution).

**What it does:**
- Asks for confirmation before proceeding
- Removes `emailNotifications` field from all users
- Provides summary of changes
- Verifies the rollback

**Usage:**
```bash
cd backend
node migrations/rollback-email-notifications.js
```

**⚠️ WARNING:** This will remove all user email notification preferences!

## Migration Workflow

### Step 1: Verify Current State
Before running the migration, check the current state:

```bash
node migrations/verify-email-notifications.js
```

This will show you:
- How many users need migration
- Current preference distribution
- Sample of existing data

### Step 2: Run Migration
Run the migration script to add preferences to all users:

```bash
node migrations/add-email-notifications-to-users.js
```

Expected output:
```
✅ MongoDB connected successfully
🔄 Starting migration: Add email notification preferences to users...
📊 Found 150 users without email notification preferences
📦 Processing batch 1 (100 users)...
   ✓ Updated 10 users...
   ✓ Updated 20 users...
   ...
📊 Migration Summary:
✅ Successfully updated: 150 users
❌ Failed to update: 0 users
📈 Total processed: 150 users
✅ Verification successful! All users now have email notification preferences.
```

### Step 3: Verify Migration
After migration, verify everything worked correctly:

```bash
node migrations/verify-email-notifications.js
```

Expected output:
```
📊 Total users in database: 150
✅ Users with preferences: 150 (100.00%)
❌ Users without preferences: 0 (0.00%)
✅ STATUS: All users have email notification preferences!
✅ Migration is complete and successful.
```

## Rollback (If Needed)

If you need to undo the migration:

```bash
node migrations/rollback-email-notifications.js
```

You will be asked to confirm:
```
⚠️  WARNING: This will remove email notification preferences from ALL users!
⚠️  This action cannot be undone easily.

Are you sure you want to proceed? (yes/no):
```

Type `yes` to proceed or `no` to cancel.

## Best Practices

### Before Migration
1. ✅ Backup your database
2. ✅ Run verification script to see current state
3. ✅ Test migration on a staging/development database first
4. ✅ Ensure backend server is not running (to avoid conflicts)

### During Migration
1. ✅ Monitor the output for errors
2. ✅ Don't interrupt the process
3. ✅ Note any error messages

### After Migration
1. ✅ Run verification script to confirm success
2. ✅ Check a few user records manually in the database
3. ✅ Test the Settings page in the frontend
4. ✅ Monitor application logs for any issues

## Troubleshooting

### Issue: "MongoDB connection error"
**Solution:** 
- Check if MongoDB is running
- Verify MONGO_URI in .env file
- Check network connectivity

### Issue: "Some users failed to update"
**Solution:**
- Check the error messages in the output
- Verify user documents are not corrupted
- Run the migration again (it will only update users without preferences)

### Issue: "Migration seems stuck"
**Solution:**
- Check MongoDB server status
- Check network connectivity
- Look for any error messages
- If necessary, stop and restart the migration

### Issue: "Verification shows users without preferences after migration"
**Solution:**
- Run the migration script again
- Check if there were any errors during migration
- Manually inspect the problematic user documents

## Database Backup

Before running any migration, it's recommended to backup your database:

### MongoDB Backup Command
```bash
# Backup entire database
mongodump --uri="YOUR_MONGO_URI" --out=./backup-$(date +%Y%m%d)

# Backup only users collection
mongodump --uri="YOUR_MONGO_URI" --collection=users --out=./backup-users-$(date +%Y%m%d)
```

### MongoDB Restore Command
```bash
# Restore entire database
mongorestore --uri="YOUR_MONGO_URI" ./backup-20241215

# Restore only users collection
mongorestore --uri="YOUR_MONGO_URI" --collection=users ./backup-users-20241215/users.bson
```

## Performance Considerations

### Batch Processing
The migration script processes users in batches of 100 to:
- Reduce memory usage
- Provide progress updates
- Allow for interruption and resumption

### Large Databases
For databases with many users (>10,000):
- Consider running during off-peak hours
- Monitor server resources
- Increase batch size if needed (edit the script)

## Testing

### Test on Development Database
```bash
# 1. Use development database
export MONGO_URI="mongodb://localhost:27017/fraction-dev"

# 2. Run verification
node migrations/verify-email-notifications.js

# 3. Run migration
node migrations/add-email-notifications-to-users.js

# 4. Verify results
node migrations/verify-email-notifications.js
```

### Test Rollback
```bash
# 1. Run rollback
node migrations/rollback-email-notifications.js

# 2. Verify rollback
node migrations/verify-email-notifications.js

# 3. Re-run migration
node migrations/add-email-notifications-to-users.js
```

## Monitoring

After migration, monitor:
- Application logs for email-related errors
- User feedback about email notifications
- Email sending rates
- Database performance

## Support

If you encounter issues:
1. Check this README
2. Review the script output
3. Check MongoDB logs
4. Verify .env configuration
5. Contact the development team

## Script Details

### Dependencies
- mongoose
- dotenv
- readline (for rollback confirmation)

### Environment Variables Required
- `MONGO_URI` - MongoDB connection string

### Exit Codes
- `0` - Success
- `1` - Error occurred

## Changelog

### Version 1.0.0 (December 2024)
- Initial migration scripts created
- Added verification script
- Added rollback script
- Added comprehensive documentation

---

**Last Updated:** December 2024
**Maintainer:** Fraction Development Team
