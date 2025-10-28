# Database Migration Scripts

This directory contains migration scripts for the Most Browsed Cars feature.

## Available Migrations

### 1. Add ViewCount Field (`migrate-add-viewcount.js`)
- **Purpose**: Adds the `viewCount` field to all existing cars
- **Safe**: Yes - only adds new field with default value 0
- **When to use**: Run this first when deploying the most browsed cars feature

```bash
node scripts/migrate-add-viewcount.js
```

### 2. Add Sample Views (`migrate-add-sample-views.js`)
- **Purpose**: Adds random sample view counts to cars for testing
- **Safe**: Yes - only updates existing viewCount values
- **When to use**: For testing/demo purposes to see the feature in action

```bash
node scripts/migrate-add-sample-views.js
```

### 3. Remove ViewCount Field (`migrate-remove-viewcount.js`)
- **Purpose**: Removes the `viewCount` field from all cars (rollback)
- **Safe**: No - permanently deletes view count data
- **When to use**: Only if you need to completely remove the feature

```bash
node scripts/migrate-remove-viewcount.js
```

## Using the Migration Runner

The `run-migrations.js` script provides a convenient way to run migrations:

```bash
# Show help
node scripts/run-migrations.js help

# List all migrations
node scripts/run-migrations.js list

# Run specific migration
node scripts/run-migrations.js add-viewcount
node scripts/run-migrations.js add-sample-views
node scripts/run-migrations.js remove-viewcount
```

## Migration Workflow

### For Production Deployment:

1. **Deploy the code** with the new viewCount field
2. **Run the basic migration**:
   ```bash
   node scripts/migrate-add-viewcount.js
   ```
3. **Verify** that all cars now have viewCount field
4. **Start tracking** real user views

### For Testing/Demo:

1. **Run the basic migration**:
   ```bash
   node scripts/migrate-add-viewcount.js
   ```
2. **Add sample data**:
   ```bash
   node scripts/migrate-add-sample-views.js
   ```
3. **Test the feature** with realistic data

### For Rollback:

1. **Run the rollback migration**:
   ```bash
   node scripts/migrate-remove-viewcount.js
   ```
2. **Revert the code** to previous version

## Environment Variables

Make sure these environment variables are set:

```bash
MONGODB_URI=mongodb://localhost:27017/fraction
# or your production MongoDB connection string
```

## Safety Notes

- ✅ **Safe migrations**: `add-viewcount`, `add-sample-views`
- ⚠️ **Destructive migration**: `remove-viewcount` (permanently deletes data)
- 🔒 **Always backup** your database before running migrations in production
- 🧪 **Test migrations** in a development environment first

## Troubleshooting

### Migration fails with connection error:
- Check your `MONGODB_URI` environment variable
- Ensure MongoDB is running and accessible
- Verify network connectivity

### Migration shows "No cars found":
- This is normal if your database is empty
- The migration will complete successfully with no changes

### Some cars still don't have viewCount after migration:
- Check the migration logs for any errors
- Run the migration again - it's safe to run multiple times
- Manually verify a few cars in your database

## Logs

All migrations provide detailed logging:
- ✅ Success messages
- ❌ Error messages with stack traces
- 📊 Statistics about affected records
- 🔍 Verification of migration results

## Support

If you encounter issues:
1. Check the migration logs for specific error messages
2. Verify your database connection and permissions
3. Ensure you're running the migration from the correct directory
4. Check that all required environment variables are set