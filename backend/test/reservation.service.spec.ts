import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReservationService } from '../src/modules/reservation/reservation.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RegionValidatorService } from '../src/domain/services/region-validator.service';
import { RegionService } from '../src/modules/region/region.service';
import { ReservationGateway } from '../src/modules/reservation/reservation.gateway';
import { ReservationStatus } from '@prisma/client';

describe('ReservationService', () => {
  let service: ReservationService;
  let prisma: PrismaService;
  let gateway: ReservationGateway;
  let regionService: RegionService;

  // Mock region data
  const mockRegion = {
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
  };

  const mockBarRegion = {
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
  };

  const mockPrismaService = {
    reservation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    region: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockRegionService = {
    getAllRegions: jest.fn(),
    getRegionById: jest.fn(),
    getRegionByName: jest.fn(),
    getValidRegionsForParty: jest.fn(),
  };

  const mockGateway = {
    notifyAvailabilityChange: jest.fn(),
    notifyLockExpired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        RegionValidatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RegionService,
          useValue: mockRegionService,
        },
        {
          provide: ReservationGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    prisma = module.get<PrismaService>(PrismaService);
    gateway = module.get<ReservationGateway>(ReservationGateway);
    regionService = module.get<RegionService>(RegionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('lockSlot', () => {
    it('should lock table successfully when tables are available', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockRegion.id,
        sessionId: 'test-session-123',
      };

      mockPrismaService.region.findUnique.mockResolvedValue(mockRegion);
      mockPrismaService.reservation.count.mockResolvedValue(2); // 2 tables occupied out of 4
      mockPrismaService.reservation.create.mockResolvedValue({
        id: 'lock-id-123',
        ...dto,
        date: new Date('2025-07-24'),
        status: ReservationStatus.LOCKED,
        lockedUntil: new Date(),
        customerName: 'PENDING',
        email: 'pending@temp.com',
        phone: '+00000000000',
        partySize: 1,
        childrenCount: 0,
        hasSmokingRequest: false,
        hasBirthday: false,
        lockedBy: dto.sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.lockSlot(dto);

      expect(result.lockId).toBe('lock-id-123');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPrismaService.reservation.count).toHaveBeenCalled();
      expect(mockGateway.notifyAvailabilityChange).toHaveBeenCalledWith(
        dto.date,
        dto.timeSlot,
        dto.regionId,
      );
    });

    it('should fail to lock when no tables available', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockRegion.id,
        sessionId: 'test-session-123',
      };

      mockPrismaService.region.findUnique.mockResolvedValue(mockRegion);
      mockPrismaService.reservation.count.mockResolvedValue(4); // All 4 tables occupied

      await expect(service.lockSlot(dto)).rejects.toThrow(ConflictException);
      await expect(service.lockSlot(dto)).rejects.toThrow(
        'No tables available in this region for the selected time slot',
      );
    });
  });

  describe('createReservation', () => {
    it('should create reservation from valid lock', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockRegion.id,
        sessionId: 'test-session-123',
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        partySize: 4,
        childrenCount: 1,
        hasSmokingRequest: false,
        hasBirthday: false,
      };

      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 5);

      mockRegionService.getRegionById.mockResolvedValue(mockRegion);
      mockPrismaService.reservation.findFirst.mockResolvedValue({
        id: 'lock-id-123',
        status: ReservationStatus.LOCKED,
        lockedBy: dto.sessionId,
        lockedUntil: futureDate,
        regionId: dto.regionId,
        date: new Date('2025-07-24'),
        timeSlot: dto.timeSlot,
      });

      mockPrismaService.reservation.update.mockResolvedValue({
        id: 'lock-id-123',
        ...dto,
        date: new Date('2025-07-24'),
        status: ReservationStatus.CONFIRMED,
        region: mockRegion,
        createdAt: new Date(),
        updatedAt: new Date(),
        lockedBy: null,
        lockedUntil: null,
        birthdayName: null,
      });

      const result = await service.createReservation(dto);

      expect(result.id).toBe('lock-id-123');
      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(mockGateway.notifyAvailabilityChange).toHaveBeenCalled();
    });

    it('should fail to create reservation without lock', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockRegion.id,
        sessionId: 'test-session-123',
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        partySize: 4,
        childrenCount: 1,
        hasSmokingRequest: false,
        hasBirthday: false,
      };

      mockRegionService.getRegionById.mockResolvedValue(mockRegion);
      mockPrismaService.reservation.findFirst.mockResolvedValue(null);

      await expect(service.createReservation(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should fail if business rules violated (children in BAR)', async () => {
      const dto = {
        date: '2025-07-24',
        timeSlot: '19:00',
        regionId: mockBarRegion.id,
        sessionId: 'test-session-123',
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        partySize: 3,
        childrenCount: 1,
        hasSmokingRequest: false,
        hasBirthday: false,
      };

      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 5);

      mockRegionService.getRegionById.mockResolvedValue(mockBarRegion);
      mockPrismaService.reservation.findFirst.mockResolvedValue({
        id: 'lock-id-123',
        status: ReservationStatus.LOCKED,
        lockedBy: dto.sessionId,
        lockedUntil: futureDate,
        regionId: dto.regionId,
        date: new Date('2025-07-24'),
        timeSlot: dto.timeSlot,
      });

      await expect(service.createReservation(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully', async () => {
      const sessionId = 'test-session-123';

      mockPrismaService.reservation.findMany.mockResolvedValue([
        {
          id: 'lock-1',
          date: new Date('2025-07-24'),
          timeSlot: '19:00',
          regionId: mockRegion.id,
          status: ReservationStatus.LOCKED,
          lockedBy: sessionId,
        },
      ]);

      mockPrismaService.reservation.deleteMany.mockResolvedValue({ count: 1 });

      await service.releaseLock(sessionId);

      expect(mockPrismaService.reservation.deleteMany).toHaveBeenCalledWith({
        where: {
          status: ReservationStatus.LOCKED,
          lockedBy: sessionId,
        },
      });
      expect(mockGateway.notifyAvailabilityChange).toHaveBeenCalled();
    });
  });
});
