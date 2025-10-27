import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from '../src/modules/availability/availability.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RegionValidatorService } from '../src/domain/services/region-validator.service';
import { RegionService } from '../src/modules/region/region.service';
import { ReservationStatus } from '@prisma/client';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: PrismaService;
  let regionService: RegionService;

  // Mock region data
  const mockRegions = [
    {
      id: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
      name: 'MAIN_HALL',
      displayName: 'Main Hall',
      capacity: 12,
      tables: 4,
      allowChildren: true,
      allowSmoking: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '6805ddaa-08c8-4daf-acdd-3eeb646656eb',
      name: 'BAR',
      displayName: 'Bar',
      capacity: 4,
      tables: 6,
      allowChildren: false,
      allowSmoking: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '495eb4c6-09db-4b22-893b-5aa9549f15c6',
      name: 'RIVERSIDE',
      displayName: 'Riverside',
      capacity: 8,
      tables: 5,
      allowChildren: true,
      allowSmoking: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'e9a2fa91-ab34-4d15-9a43-e0201e5e5a50',
      name: 'RIVERSIDE_SMOKING',
      displayName: 'Riverside Smoking',
      capacity: 6,
      tables: 4,
      allowChildren: false,
      allowSmoking: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPrismaService = {
    reservation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRegionService = {
    getAllRegions: jest.fn(),
    getRegionById: jest.fn(),
    getRegionByName: jest.fn(),
    getValidRegionsForParty: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        RegionValidatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RegionService,
          useValue: mockRegionService,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    prisma = module.get<PrismaService>(PrismaService);
    regionService = module.get<RegionService>(RegionService);

    // Default mock implementations
    mockRegionService.getAllRegions.mockResolvedValue(mockRegions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableSlots', () => {
    it('should return available slots with table counts', async () => {
      const date = '2025-07-24';

      // 2 tables reserved in MAIN_HALL at 19:00
      mockPrismaService.reservation.findMany.mockResolvedValue([
        {
          timeSlot: '19:00',
          regionId: mockRegions[0].id, // MAIN_HALL
          status: ReservationStatus.CONFIRMED,
        },
        {
          timeSlot: '19:00',
          regionId: mockRegions[0].id, // MAIN_HALL
          status: ReservationStatus.CONFIRMED,
        },
      ]);

      const result = await service.getAvailableSlots(date);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check that 19:00 MAIN_HALL has 2 available tables (4 - 2)
      const slot1900 = result.find((s) => s.timeSlot === '19:00');
      expect(slot1900).toBeDefined();

      const mainHall = slot1900!.availableRegions.find(
        (r) => r.region.name === 'MAIN_HALL',
      );
      expect(mainHall).toBeDefined();
      expect(mainHall!.availableTables).toBe(2);
    });

    it('should return all tables available when no reservations', async () => {
      const date = '2025-07-25';

      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots(date);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // All slots should have all regions with all tables available
      result.forEach((slot) => {
        expect(slot.availableRegions.length).toBe(4); // All 4 regions
        slot.availableRegions.forEach((regionInfo) => {
          expect(regionInfo.availableTables).toBe(regionInfo.region.tables);
        });
      });
    });

    it('should filter out regions with no available tables', async () => {
      const date = '2025-07-26';

      // All 4 tables in MAIN_HALL reserved
      mockPrismaService.reservation.findMany.mockResolvedValue([
        {
          timeSlot: '20:00',
          regionId: mockRegions[0].id,
          status: ReservationStatus.CONFIRMED,
        },
        {
          timeSlot: '20:00',
          regionId: mockRegions[0].id,
          status: ReservationStatus.CONFIRMED,
        },
        {
          timeSlot: '20:00',
          regionId: mockRegions[0].id,
          status: ReservationStatus.CONFIRMED,
        },
        {
          timeSlot: '20:00',
          regionId: mockRegions[0].id,
          status: ReservationStatus.CONFIRMED,
        },
      ]);

      const result = await service.getAvailableSlots(date);

      const slot2000 = result.find((s) => s.timeSlot === '20:00');
      expect(slot2000).toBeDefined();

      // MAIN_HALL should not be in available regions
      const mainHall = slot2000!.availableRegions.find(
        (r) => r.region.name === 'MAIN_HALL',
      );
      expect(mainHall).toBeUndefined();
    });
  });

  describe('checkAvailability', () => {
    it('should check availability correctly with available tables', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockRegions[0].id, // MAIN_HALL
        partySize: 4,
        childrenCount: 1,
        hasSmokingRequest: false,
      };

      mockRegionService.getRegionById.mockResolvedValue(mockRegions[0]);
      mockPrismaService.reservation.count.mockResolvedValue(2); // 2 out of 4 tables occupied

      const result = await service.checkAvailability(dto);

      expect(result.available).toBe(true);
      expect(result.availableTables).toBe(2);
      expect(result.reason).toBeUndefined();
    });

    it('should return unavailable when no tables available', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockRegions[0].id,
        partySize: 4,
        childrenCount: 1,
        hasSmokingRequest: false,
      };

      mockRegionService.getRegionById.mockResolvedValue(mockRegions[0]);
      mockPrismaService.reservation.count.mockResolvedValue(4); // All 4 tables occupied

      const result = await service.checkAvailability(dto);

      expect(result.available).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('No tables available');
    });

    it('should return unavailable when children not allowed in region', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockRegions[1].id, // BAR
        partySize: 3,
        childrenCount: 1,
        hasSmokingRequest: false,
      };

      mockRegionService.getRegionById.mockResolvedValue(mockRegions[1]);
      mockPrismaService.reservation.count.mockResolvedValue(0);

      const result = await service.checkAvailability(dto);

      expect(result.available).toBe(false);
      expect(result.reason).toContain('does not allow children');
    });

    it('should return unavailable when smoking requested in non-smoking region', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockRegions[0].id, // MAIN_HALL
        partySize: 4,
        childrenCount: 0,
        hasSmokingRequest: true,
      };

      mockRegionService.getRegionById.mockResolvedValue(mockRegions[0]);
      mockPrismaService.reservation.count.mockResolvedValue(0);

      const result = await service.checkAvailability(dto);

      expect(result.available).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('getAlternatives', () => {
    it('should suggest alternatives when unavailable', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        partySize: 4,
        childrenCount: 0,
        hasSmokingRequest: false,
      };

      // Regions that allow this party configuration
      const validRegions = mockRegions.filter((r) => r.allowChildren || dto.childrenCount === 0);
      mockRegionService.getValidRegionsForParty.mockResolvedValue(validRegions);

      mockRegionService.getRegionById.mockImplementation((id) => {
        return Promise.resolve(mockRegions.find((r) => r.id === id));
      });

      mockPrismaService.reservation.count.mockResolvedValue(0);

      const result = await service.getAlternatives(dto);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should have alternatives from different times and regions
      const hasOtherTimes = result.some((alt) => alt.timeSlot !== '19:00');
      expect(hasOtherTimes).toBe(true);

      // Alternatives should include table availability info
      result.forEach((alt) => {
        if (alt.available) {
          expect(alt.availableTables).toBeDefined();
        }
      });
    });
  });
});
