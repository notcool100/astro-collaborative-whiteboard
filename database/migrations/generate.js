/**
 * Migration Generator for PCS Draw
 * 
 * This script generates a new migration file with the current timestamp.
 * 
 * Usage:
 *   node generate.js "migration description"
 * 
 * Example:
 *   node generate.js "add user preferences"
 *   => Creates: scripts/20240601123456-add-user-preferences.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  migrationsDir: path.join(__dirname, 'scripts'),
  templatePath: path.join(__dirname, 'templates', 'migration-template.js')
};

// Get migration description from command line
const description = process.argv[2];

if (!description) {
  console.error('Error: Migration description is required');
  console.log('Usage: node generate.js "migration description"');
  process.exit(1);
}

// Generate migration name
const timestamp = new Date().toISOString()
  .replace(/[^0-9]/g, '')
  .slice(0, 14); // YYYYMMDDHHmmss

const migrationName = `${timestamp}-${description.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const migrationPath = path.join(config.migrationsDir, `${migrationName}.js`);

// Ensure migrations directory exists
if (!fs.existsSync(config.migrationsDir)) {
  fs.mkdirSync(config.migrationsDir, { recursive: true });
}

// Read template file
let templateContent;
try {
  templateContent = fs.readFileSync(config.templatePath, 'utf8');
} catch (error) {
  console.error('Error reading template file:', error);
  process.exit(1);
}

// Replace placeholders in template
const migrationContent = templateContent
  .replace(/\[MIGRATION_NAME\]/g, description)
  .replace(/\[MIGRATION_DESCRIPTION\]/g, `Migration for: ${description}`)
  .replace(/\[CHANGE_1\]/g, 'Add your changes here')
  .replace(/\[CHANGE_2\]/g, 'Add more changes here');

// Write migration file
try {
  fs.writeFileSync(migrationPath, migrationContent);
  console.log(`Migration file created: ${migrationPath}`);
} catch (error) {
  console.error('Error writing migration file:', error);
  process.exit(1);
}

console.log('\nNext steps:');
console.log('1. Edit the migration file to implement your changes');
console.log('2. Run the migration with: node migration-runner.js up');
console.log('3. To revert the migration: node migration-runner.js down');