# Database Migration Scripts

This directory contains scripts to update the database schema and migrate existing data.

## Update Cars StopBookings Field

### Problem
Existing car records in the database don't have the `stopBookings` field that was added to the Car model. This field is required for the new stop bookings functionality.

### Solution
Run one of the migration scripts to add the `stopBookings` field to all existing car records with a default value of `false` (bookings allowed).

### Available Scripts

#### Option 1: Using Mongoose (Recommended)
```bash
cd backend
npm run update-cars-stopbookings
```

#### Option 2: Using MongoDB Driver
```bash
cd backend
npm run update-cars-mongodb
```

### What the Scripts Do

1. **Connect to MongoDB** using the connection string from environment variables
2. **Find all cars** that don't have the `stopBookings` field
3. **Update all matching cars** to add `stopBookings: false`
4. **Verify the update** by counting cars with the new field
5. **Show sample results** to confirm the update worked

### Expected Output

```
Connecting to MongoDB...
Connected successfully to MongoDB
Total cars in database: 25
Cars without stopBookings field: 25
Updating cars...
Successfully updated 25 cars
All cars now have stopBookings field set to false (bookings allowed)
Verification: 25 cars now have stopBookings field
Sample updated cars:
- Toyota Camry: stopBookings = false
- Honda Civic: stopBookings = false
- BMW X5: stopBookings = false
Update completed successfully!
Database connection closed
```

### Safety Features

- **Non-destructive**: Only adds the missing field, doesn't modify existing data
- **Idempotent**: Can be run multiple times safely
- **Verification**: Shows before/after counts to confirm success
- **Sample output**: Displays examples of updated records

### Environment Variables Required

Make sure your `.env` file contains:
```
MONGODB_URI=mongodb://localhost:27017/your-database-name
```

### Troubleshooting

If you encounter issues:

1. **Connection Error**: Check your MongoDB connection string in `.env`
2. **Permission Error**: Ensure your MongoDB user has write permissions
3. **No Cars Found**: The script will report if no cars need updating

### After Running the Script

Once the migration is complete:
- All existing cars will have `stopBookings: false` (bookings allowed)
- New cars created through the frontend will have the field by default
- The stop bookings functionality will work for all cars
