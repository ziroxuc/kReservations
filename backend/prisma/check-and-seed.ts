import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function checkAndSeed() {
  try {
    console.log('Checking if database needs seeding...');

    const regionCount = await prisma.region.count();

    if (regionCount === 0) {
      console.log('Database is empty. Running seed...');

      const { stdout, stderr } = await execAsync('npm run prisma:seed');

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      console.log('Seed completed successfully!');
    } else {
      console.log(`Database already has ${regionCount} region(s). Skipping seed.`);
    }
  } catch (error) {
    console.error('Error during check and seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed();
