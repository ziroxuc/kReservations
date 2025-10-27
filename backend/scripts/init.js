#!/usr/bin/env node

/**
 * Production initialization script
 * Runs database migrations and seeds initial data if needed
 */

const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Region configurations matching seed.ts
const REGIONS = [
  {
    name: 'MAIN_HALL',
    displayName: 'Main Hall',
    capacity: 12,
    tables: 2,
    allowChildren: true,
    allowSmoking: false,
    isActive: true,
  },
  {
    name: 'BAR',
    displayName: 'Bar',
    capacity: 4,
    tables: 4,
    allowChildren: false,
    allowSmoking: false,
    isActive: true,
  },
  {
    name: 'RIVERSIDE',
    displayName: 'Riverside',
    capacity: 8,
    tables: 3,
    allowChildren: true,
    allowSmoking: false,
    isActive: true,
  },
  {
    name: 'RIVERSIDE_SMOKING',
    displayName: 'Riverside Smoking',
    capacity: 6,
    tables: 5,
    allowChildren: false,
    allowSmoking: true,
    isActive: true,
  },
];

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  try {
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warnings')) console.error(stderr);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    throw error;
  }
}

async function checkAndSeedDatabase() {
  console.log('🔍 Checking if database needs seeding...');

  try {
    const regionCount = await prisma.region.count();

    if (regionCount === 0) {
      console.log('🌱 Database is empty. Seeding regions...');

      for (const region of REGIONS) {
        await prisma.region.create({ data: region });
        console.log(`  ✓ Created region: ${region.displayName} (${region.tables} tables, ${region.capacity} people per table)`);
      }

      console.log('✅ Database seeded successfully!');
      console.log('🍽️  Restaurant is ready to accept reservations from July 24-31, 2025');
    } else {
      console.log(`✅ Database already has ${regionCount} region(s). Skipping seed.`);
    }
  } catch (error) {
    console.error('❌ Error during database check/seed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function startApplication() {
  console.log('🚀 Starting application...');
  try {
    // Use require to dynamically load and start the application
    require('../dist/main');
  } catch (error) {
    console.error('❌ Error starting application:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🏁 Starting Kafè Backend initialization...\n');

    // Step 1: Run migrations
    await runMigrations();
    console.log('');

    // Step 2: Check and seed database
    await checkAndSeedDatabase();
    console.log('');

    // Step 3: Start the application
    await startApplication();

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

// Run initialization
main();
