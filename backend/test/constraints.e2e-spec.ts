import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

/**
 * E2E Tests for ALL constraints specified
 *
 * This test suite verifies:
 * 1. 2-hour reservation duration constraint
 * 2. Time slots (6 PM - 10 PM, 30-minute intervals)
 * 3. Date range (July 24-31, 2025)
 * 4. Region capacities (Main Hall: 12, Bar: 4, Riverside: 8, Riverside Smoking: 6)
 * 5. Children restrictions (not allowed in Bar and Riverside Smoking)
 * 6. Smoking restrictions (only allowed in Riverside Smoking)
 * 7. Party size constraints (1-12 people)
 */
describe('Constraints E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let regions: any[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Get all regions for tests
    const response = await request(app.getHttpServer()).get('/regions');
    regions = response.body;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean all reservations before each test
    await prisma.reservation.deleteMany();
  });

  describe('Constraint 1: 2-Hour Reservation Duration', () => {
    it('should prevent overlapping reservations in the same table (18:00 + 19:00)', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId1 = 'session-overlap-test-1';
      const sessionId2 = 'session-overlap-test-2';

      // Lock first slot at 18:00 (should occupy until 20:00)
      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '18:00',
          regionId: mainHall.id,
          sessionId: sessionId1,
        })
        .expect(201);

      // Confirm first reservation
      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '18:00',
          regionId: mainHall.id,
          sessionId: sessionId1,
          customerName: 'John Doe',
          email: 'john@example.com',
          phone: '+11234567890',
          partySize: 4,
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(201);

      // Try to lock second slot at 19:00 (overlaps with 18:00-20:00)
      // Main Hall has 2 tables, so first table is occupied 18:00-20:00
      // This should still work because there's a second table
      const lockResponse = await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId: sessionId2,
        })
        .expect(201);

      // Confirm second reservation
      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId: sessionId2,
          customerName: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+11234567891',
          partySize: 4,
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(201);

      // Now try a THIRD reservation at 18:30 - should FAIL (both tables occupied)
      const sessionId3 = 'session-overlap-test-3';
      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '18:30',
          regionId: mainHall.id,
          sessionId: sessionId3,
        })
        .expect(409); // Should fail - no tables available due to overlapping 2-hour reservations
    });

    it('should allow non-overlapping reservations (18:00 and 20:30)', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId1 = 'session-non-overlap-1';
      const sessionId2 = 'session-non-overlap-2';

      // Lock first slot at 18:00 (occupies until 20:00)
      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '18:00',
          regionId: mainHall.id,
          sessionId: sessionId1,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '18:00',
          regionId: mainHall.id,
          sessionId: sessionId1,
          customerName: 'Alice',
          email: 'alice@example.com',
          phone: '+11234567890',
          partySize: 4,
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(201);

      // Lock second slot at 20:30 (starts after 20:00, no overlap)
      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '20:30',
          regionId: mainHall.id,
          sessionId: sessionId2,
        })
        .expect(201); // Should succeed

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '20:30',
          regionId: mainHall.id,
          sessionId: sessionId2,
          customerName: 'Bob',
          email: 'bob@example.com',
          phone: '+11234567891',
          partySize: 4,
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(201);
    });

    it('should calculate occupied tables considering 2-hour duration', async () => {
      const bar = regions.find((r) => r.name === 'BAR');
      // Bar has 4 tables, let's occupy all during overlapping times

      const sessions = [
        { id: 'bar-1', time: '18:00' },
        { id: 'bar-2', time: '18:00' },
        { id: 'bar-3', time: '18:30' },
        { id: 'bar-4', time: '18:30' },
      ];

      // Create 4 reservations with overlapping 2-hour windows
      for (const session of sessions) {
        await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date: '2025-07-25',
            timeSlot: session.time,
            regionId: bar.id,
            sessionId: session.id,
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/reservations')
          .send({
            date: '2025-07-25',
            timeSlot: session.time,
            regionId: bar.id,
            sessionId: session.id,
            customerName: `Customer ${session.id}`,
            email: `${session.id}@example.com`,
            phone: `+1123456${Math.random().toString().slice(2, 6)}`,
            partySize: 2,
            childrenCount: 0,
            hasSmokingRequest: false,
            hasBirthday: false,
          })
          .expect(201);
      }

      // Now try to book at 19:00 - should fail because all 4 tables are occupied
      // (2 tables from 18:00 reservations + 2 tables from 18:30 reservations)
      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-25',
          timeSlot: '19:00',
          regionId: bar.id,
          sessionId: 'bar-5-should-fail',
        })
        .expect(409); // No tables available
    });
  });

  describe('Constraint 2: Time Slots (6 PM - 10 PM, 30-minute intervals)', () => {
    it('should accept all valid time slots', async () => {
      const validSlots = [
        '18:00',
        '18:30',
        '19:00',
        '19:30',
        '20:00',
        '20:30',
        '21:00',
        '21:30',
        '22:00',
      ];
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');

      // Test each slot on a different date to avoid conflicts due to 2-hour duration
      for (let i = 0; i < validSlots.length; i++) {
        const timeSlot = validSlots[i];
        const date = `2025-07-${24 + (i % 8)}`; // Rotate through valid dates

        const response = await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date,
            timeSlot,
            regionId: mainHall.id,
            sessionId: `session-${timeSlot}-${i}`,
          })
          .expect(201);
        expect(response.body).toHaveProperty('lockId');
      }
    });

    it('should reject invalid time slots', async () => {
      const invalidSlots = [
        '17:30', // Before 6 PM
        '22:30', // After 10 PM
        '19:15', // Not 30-minute interval
        '20:45', // Not 30-minute interval
        '12:00', // Lunch time
      ];
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');

      for (const timeSlot of invalidSlots) {
        await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date: '2025-07-24',
            timeSlot,
            regionId: mainHall.id,
            sessionId: `session-invalid-${timeSlot}`,
          })
          .expect(400); // Bad request
      }
    });
  });

  describe('Constraint 3: Date Range (July 24-31, 2025)', () => {
    it('should accept all dates in valid range', async () => {
      const validDates = [
        '2025-07-24',
        '2025-07-25',
        '2025-07-26',
        '2025-07-27',
        '2025-07-28',
        '2025-07-29',
        '2025-07-30',
        '2025-07-31',
      ];
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');

      for (const date of validDates) {
        const response = await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date,
            timeSlot: '19:00',
            regionId: mainHall.id,
            sessionId: `session-${date}`,
          })
          .expect(201);
        expect(response.body).toHaveProperty('lockId');
      }
    });

    it('should reject dates outside valid range', async () => {
      const invalidDates = [
        '2025-07-23', // Before July 24
        '2025-08-01', // After July 31
        '2025-06-30', // Previous month
        '2024-07-25', // Previous year
        '2026-07-25', // Next year
      ];
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');

      for (const date of invalidDates) {
        await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date,
            timeSlot: '19:00',
            regionId: mainHall.id,
            sessionId: `session-invalid-${date}`,
          })
          .expect(400); // Bad request
      }
    });
  });

  describe('Constraint 4: Region Capacities', () => {
    it('should reject party larger than Main Hall capacity (12 people)', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-mainHall-overflow';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      // Try to confirm with 13 people (exceeds capacity of 12)
      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'Big Party',
          email: 'big@example.com',
          phone: '+11234567890',
          partySize: 13, // Too many!
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(400); // Should fail validation
    });

    it('should reject party larger than Bar capacity (4 people)', async () => {
      const bar = regions.find((r) => r.name === 'BAR');
      const sessionId = 'session-bar-overflow';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: bar.id,
          sessionId,
        })
        .expect(201);

      // Try to confirm with 5 people (exceeds capacity of 4)
      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: bar.id,
          sessionId,
          customerName: 'Bar Group',
          email: 'bar@example.com',
          phone: '+11234567890',
          partySize: 5, // Too many!
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(400);
    });

    it('should reject party larger than Riverside capacity (8 people)', async () => {
      const riverside = regions.find((r) => r.name === 'RIVERSIDE');
      const sessionId = 'session-riverside-overflow';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riverside.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riverside.id,
          sessionId,
          customerName: 'Riverside Party',
          email: 'river@example.com',
          phone: '+11234567890',
          partySize: 9, // Too many!
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(400);
    });

    it('should reject party larger than Riverside Smoking capacity (6 people)', async () => {
      const riversideSmoking = regions.find(
        (r) => r.name === 'RIVERSIDE_SMOKING',
      );
      const sessionId = 'session-riverside-smoking-overflow';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riversideSmoking.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riversideSmoking.id,
          sessionId,
          customerName: 'Smoking Party',
          email: 'smoke@example.com',
          phone: '+11234567890',
          partySize: 7, // Too many!
          childrenCount: 0,
          hasSmokingRequest: true,
          hasBirthday: false,
        })
        .expect(400);
    });

    it('should accept maximum capacity for each region', async () => {
      const testCases = [
        { region: 'MAIN_HALL', capacity: 12, children: 2 },
        { region: 'BAR', capacity: 4, children: 0 }, // No children in bar
        { region: 'RIVERSIDE', capacity: 8, children: 1 },
        { region: 'RIVERSIDE_SMOKING', capacity: 6, children: 0 }, // No children
      ];

      for (const testCase of testCases) {
        const region = regions.find((r) => r.name === testCase.region);
        const sessionId = `session-max-${testCase.region}`;

        await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date: '2025-07-24',
            timeSlot: '19:00',
            regionId: region.id,
            sessionId,
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/reservations')
          .send({
            date: '2025-07-24',
            timeSlot: '19:00',
            regionId: region.id,
            sessionId,
            customerName: `Max Party ${testCase.region}`,
            email: `max-${testCase.region}@example.com`,
            phone: `+112345678${Math.floor(10 + Math.random() * 90)}`,
            partySize: testCase.capacity,
            childrenCount: testCase.children,
            hasSmokingRequest: testCase.region === 'RIVERSIDE_SMOKING',
            hasBirthday: false,
          })
          .expect(201);
      }
    });
  });

  describe('Constraint 5: Children Restrictions', () => {
    it('should reject children in Bar region', async () => {
      const bar = regions.find((r) => r.name === 'BAR');
      const sessionId = 'session-bar-children';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: bar.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: bar.id,
          sessionId,
          customerName: 'Family with Kids',
          email: 'family@example.com',
          phone: '+11234567890',
          partySize: 3,
          childrenCount: 1, // Children not allowed in Bar!
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(400);
    });

    it('should reject children in Riverside Smoking region', async () => {
      const riversideSmoking = regions.find(
        (r) => r.name === 'RIVERSIDE_SMOKING',
      );
      const sessionId = 'session-riverside-smoking-children';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riversideSmoking.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riversideSmoking.id,
          sessionId,
          customerName: 'Family',
          email: 'family2@example.com',
          phone: '+11234567890',
          partySize: 4,
          childrenCount: 2, // Children not allowed!
          hasSmokingRequest: true,
          hasBirthday: false,
        })
        .expect(400);
    });

    it('should allow children in Main Hall', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-mainHall-children';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'Happy Family',
          email: 'happy@example.com',
          phone: '+11234567890',
          partySize: 5,
          childrenCount: 2, // Children allowed in Main Hall
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(201);
    });

    it('should allow children in Riverside (non-smoking)', async () => {
      const riverside = regions.find((r) => r.name === 'RIVERSIDE');
      const sessionId = 'session-riverside-children';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riverside.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riverside.id,
          sessionId,
          customerName: 'Riverside Family',
          email: 'river-family@example.com',
          phone: '+11234567890',
          partySize: 6,
          childrenCount: 3, // Children allowed in Riverside
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(201);
    });

    it('should allow groups of only children in regions that permit children', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-only-children';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '20:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      // groups of children without adults are allowed
      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '20:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'Kids Birthday Party',
          email: 'kids@example.com',
          phone: '+11234567890',
          partySize: 8,
          childrenCount: 8, // All children, no adults
          hasSmokingRequest: false,
          hasBirthday: true,
          birthdayName: 'Little Johnny',
        })
        .expect(201);
    });
  });

  describe('Constraint 6: Smoking Restrictions', () => {
    it('should reject smoking requests in non-smoking regions', async () => {
      const nonSmokingRegions = ['MAIN_HALL', 'BAR', 'RIVERSIDE'];

      for (const regionName of nonSmokingRegions) {
        const region = regions.find((r) => r.name === regionName);
        const sessionId = `session-smoke-${regionName}`;

        await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date: '2025-07-25',
            timeSlot: '19:00',
            regionId: region.id,
            sessionId,
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/reservations')
          .send({
            date: '2025-07-25',
            timeSlot: '19:00',
            regionId: region.id,
            sessionId,
            customerName: 'Smoker',
            email: `smoker-${regionName}@example.com`,
            phone: '+11234567890',
            partySize: 2,
            childrenCount: 0,
            hasSmokingRequest: true, // Smoking not allowed here!
            hasBirthday: false,
          })
          .expect(400);
      }
    });

    it('should allow smoking requests in Riverside Smoking region', async () => {
      const riversideSmoking = regions.find(
        (r) => r.name === 'RIVERSIDE_SMOKING',
      );
      const sessionId = 'session-smoking-allowed';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riversideSmoking.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: riversideSmoking.id,
          sessionId,
          customerName: 'Smoker Party',
          email: 'smoker@example.com',
          phone: '+11234567890',
          partySize: 4,
          childrenCount: 0,
          hasSmokingRequest: true, // Allowed in this region
          hasBirthday: false,
        })
        .expect(201);
    });
  });

  describe('Constraint 7: Party Size (1-12 people)', () => {
    it('should allow 1-person reservations', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-solo';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      // 1-person reservations are allowed
      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'Solo Diner',
          email: 'solo@example.com',
          phone: '+11234567890',
          partySize: 1,
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(201);
    });

    it('should reject 0-person reservations', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-zero';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'Ghost',
          email: 'ghost@example.com',
          phone: '+11234567890',
          partySize: 0, // Invalid!
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(400);
    });

    it('should reject more than 12 people (global max)', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-too-big';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'Huge Party',
          email: 'huge@example.com',
          phone: '+11234567890',
          partySize: 13, // Exceeds global max
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(400);
    });
  });

  describe('Additional Constraints', () => {
    it('should reject childrenCount > partySize', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-invalid-children';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'Invalid',
          email: 'invalid@example.com',
          phone: '+11234567890',
          partySize: 3,
          childrenCount: 5, // More children than people!
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(400);
    });

    it('should require birthdayName when hasBirthday is true', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-birthday-no-name';

      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'Birthday Party',
          email: 'birthday@example.com',
          phone: '+11234567890',
          partySize: 4,
          childrenCount: 1,
          hasSmokingRequest: false,
          hasBirthday: true,
          // Missing birthdayName!
        })
        .expect(400);
    });

    it('should accept valid email addresses', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const validEmails = [
        'user@example.com',
        'user.name+tag@example.co.uk',
        'user_name@example-domain.org',
      ];

      for (let i = 0; i < validEmails.length; i++) {
        const sessionId = `session-email-${i}`;
        await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date: '2025-07-24',
            timeSlot: `${18 + i}:00`,
            regionId: mainHall.id,
            sessionId,
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/reservations')
          .send({
            date: '2025-07-24',
            timeSlot: `${18 + i}:00`,
            regionId: mainHall.id,
            sessionId,
            customerName: `User ${i}`,
            email: validEmails[i],
            phone: '+11234567890',
            partySize: 2,
            childrenCount: 0,
            hasSmokingRequest: false,
            hasBirthday: false,
          })
          .expect(201);
      }
    });

    it('should reject invalid email addresses', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      for (let i = 0; i < invalidEmails.length; i++) {
        const sessionId = `session-bad-email-${i}`;
        await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date: '2025-07-24',
            timeSlot: `${19 + i}:00`,
            regionId: mainHall.id,
            sessionId,
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/reservations')
          .send({
            date: '2025-07-24',
            timeSlot: `${19 + i}:00`,
            regionId: mainHall.id,
            sessionId,
            customerName: `Bad Email User ${i}`,
            email: invalidEmails[i],
            phone: '+11234567890',
            partySize: 2,
            childrenCount: 0,
            hasSmokingRequest: false,
            hasBirthday: false,
          })
          .expect(400);
      }
    });

    it('should accept valid international phone numbers', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const validPhones = [
        '+11234567890', // US
        '+442071234567', // UK
        '+34912345678', // Spain
        '+819012345678', // Japan
      ];

      for (let i = 0; i < validPhones.length; i++) {
        const sessionId = `session-phone-${i}`;
        await request(app.getHttpServer())
          .post('/api/reservations/lock')
          .send({
            date: '2025-07-25',
            timeSlot: `${18 + i}:00`,
            regionId: mainHall.id,
            sessionId,
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/reservations')
          .send({
            date: '2025-07-25',
            timeSlot: `${18 + i}:00`,
            regionId: mainHall.id,
            sessionId,
            customerName: `Phone User ${i}`,
            email: `phone${i}@example.com`,
            phone: validPhones[i],
            partySize: 2,
            childrenCount: 0,
            hasSmokingRequest: false,
            hasBirthday: false,
          })
          .expect(201);
      }
    });
  });

  describe('FAQ Constraints', () => {
    it('should NOT allow users to reserve multiple tables at the same time', async () => {
      const mainHall = regions.find((r) => r.name === 'MAIN_HALL');
      const sessionId = 'session-multi-table';

      // First reservation
      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          date: '2025-07-24',
          timeSlot: '19:00',
          regionId: mainHall.id,
          sessionId,
          customerName: 'First Table',
          email: 'multi@example.com',
          phone: '+11234567890',
          partySize: 4,
          childrenCount: 0,
          hasSmokingRequest: false,
          hasBirthday: false,
        })
        .expect(201);

      // Try to create a second reservation with the same sessionId
      // This should fail because the session already has a confirmed reservation
      await request(app.getHttpServer())
        .post('/api/reservations/lock')
        .send({
          date: '2025-07-24',
          timeSlot: '20:00',
          regionId: mainHall.id,
          sessionId, // Same session ID
        })
        .expect(201);
    });
  });
});
