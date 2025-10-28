#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Migration runner script
 * This script can run individual migrations or all migrations
 */

const MIGRATIONS_DIR = __dirname;
const MIGRATIONS = {
  'add-viewcount': 'migrate-add-viewcount.js',
  'add-sample-views': 'migrate-add-sample-views.js',
  'remove-viewcount': 'migrate-remove-viewcount.js'
};

function showHelp() {
  console.log('🚀 Migration Runner');
  console.log('=' .repeat(50));
  console.log('Usage: node run-migrations.js <migration-name>');
  console.log('');
  console.log('Available migrations:');
  console.log('  add-viewcount     - Add viewCount field to existing cars');
  console.log('  add-sample-views  - Add sample view counts for testing');
  console.log('  remove-viewcount  - Remove viewCount field (rollback)');
  console.log('  list              - List all available migrations');
  console.log('  help              - Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node run-migrations.js add-viewcount');
  console.log('  node run-migrations.js add-sample-views');
  console.log('  node run-migrations.js remove-viewcount');
}

function listMigrations() {
  console.log('📋 Available Migrations:');
  console.log('=' .repeat(50));
  
  Object.entries(MIGRATIONS).forEach(([name, file]) => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const exists = fs.existsSync(filePath);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${name.padEnd(20)} - ${file}`);
  });
}

function runMigration(migrationName) {
  const migrationFile = MIGRATIONS[migrationName];
  
  if (!migrationFile) {
    console.error(`❌ Unknown migration: ${migrationName}`);
    console.log('Run "node run-migrations.js help" to see available migrations');
    process.exit(1);
  }
  
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }
  
  console.log(`🚀 Running migration: ${migrationName}`);
  console.log(`📁 File: ${migrationFile}`);
  console.log('=' .repeat(50));
  
  try {
    execSync(`node "${migrationPath}"`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..')
    });
    console.log('=' .repeat(50));
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.log('=' .repeat(50));
    console.error('❌ Migration failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ No migration specified');
    showHelp();
    process.exit(1);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    case 'list':
      listMigrations();
      break;
      
    default:
      runMigration(command);
  }
}

// Run the script
main();
