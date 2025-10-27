import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean existing data
  await prisma.reservation.deleteMany();
  console.log('Cleaned existing reservations');

  await prisma.region.deleteMany();
  console.log('Cleaned existing regions');

  // Seed regions with multiple tables
  const regions = [
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

  for (const region of regions) {
    await prisma.region.create({
      data: region,
    });
    console.log(`Created region: ${region.displayName} (${region.tables} tables, ${region.capacity} people per table)`);
  }

  console.log('Database seeded successfully!');
  console.log('Restaurant is ready to accept reservations from July 24-31, 2025');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
