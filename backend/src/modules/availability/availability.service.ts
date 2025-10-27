import { Injectable, Logger } from '@nestjs/common';
import { Region, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegionValidatorService } from '../../domain/services/region-validator.service';
import { RegionService } from '../region/region.service';
import {
  CheckAvailabilityDto,
  CheckAvailabilityResponseDto,
} from './dto/check-availability.dto';
import {
  GetAlternativesDto,
  AlternativeSlotDto,
} from './dto/get-alternatives.dto';
import {
  TIME_SLOTS,
  getOverlappingTimeSlots,
} from '../../common/constants/business-rules.constants';
import { DateTimeSlot } from '../../domain/value-objects/date-time-slot.vo';

/**
 * Available slot information with tables count
 */
export interface AvailableSlot {
  timeSlot: string;
  availableRegions: Array<{
    region: Region;
    availableTables: number;
  }>;
}

/**
 * Service for checking reservation availability
 */
@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly regionValidator: RegionValidatorService,
    private readonly regionService: RegionService,
  ) {}

  /**
   * Get all available slots for a specific date
   */
  async getAvailableSlots(date: string): Promise<AvailableSlot[]> {
    this.logger.log(`Getting available slots for date: ${date}`);

    // Validate date
    new DateTimeSlot(date, '18:00');

    const dateObj = new Date(date);
    const now = new Date();

    // Get all regions
    const allRegions = await this.regionService.getAllRegions();

    // Get all confirmed or non-expired locked reservations for this date
    const reservations = await this.prisma.reservation.findMany({
      where: {
        date: dateObj,
        OR: [
          { status: ReservationStatus.CONFIRMED },
          {
            status: ReservationStatus.LOCKED,
            lockedUntil: { gt: now },
          },
        ],
      },
      select: {
        timeSlot: true,
        regionId: true,
      },
    });

    // Build map of reservations by slot and region
    const reservationsBySlot = new Map<string, Map<string, number>>();
    for (const reservation of reservations) {
      const key = reservation.timeSlot;
      if (!reservationsBySlot.has(key)) {
        reservationsBySlot.set(key, new Map());
      }
      const regionMap = reservationsBySlot.get(key)!;
      const currentCount = regionMap.get(reservation.regionId) || 0;
      regionMap.set(reservation.regionId, currentCount + 1);
    }

    // Build available slots response
    const availableSlots: AvailableSlot[] = [];
    for (const timeSlot of TIME_SLOTS) {
      // Get all slots that would overlap with a reservation at this time
      const overlappingSlots = getOverlappingTimeSlots(timeSlot);

      const availableRegions = allRegions
        .map((region) => {
          // Count tables occupied by reservations that overlap with this slot
          let occupiedCount = 0;
          for (const overlappingSlot of overlappingSlots) {
            const regionMap = reservationsBySlot.get(overlappingSlot);
            if (regionMap) {
              occupiedCount += regionMap.get(region.id) || 0;
            }
          }

          const availableTables = region.tables - occupiedCount;

          return {
            region,
            availableTables: Math.max(0, availableTables),
          };
        })
        .filter((item) => item.availableTables > 0);

      availableSlots.push({
        timeSlot,
        availableRegions,
      });
    }

    return availableSlots;
  }

  /**
   * Check if a specific slot is available
   */
  async checkAvailability(
    dto: CheckAvailabilityDto,
  ): Promise<CheckAvailabilityResponseDto> {
    this.logger.log(
      `Checking availability: ${dto.date} ${dto.timeSlot} region ${dto.regionId}`,
    );

    // Validate date and time slot
    new DateTimeSlot(dto.date, dto.timeSlot);

    // Get region info
    const region = await this.regionService.getRegionById(dto.regionId);

    // First, check business rules
    const validation = await this.regionValidator.validate(
      dto.regionId,
      dto.partySize,
      dto.childrenCount,
      dto.hasSmokingRequest,
    );

    if (!validation.valid) {
      return {
        available: false,
        reason: validation.reason,
      };
    }

    // Check if there are available tables in this slot
    // Must consider overlapping reservations (2-hour duration)
    const dateObj = new Date(dto.date);
    const now = new Date();

    // Get all time slots that would overlap with this reservation
    const overlappingSlots = getOverlappingTimeSlots(dto.timeSlot);

    // Count tables occupied by any reservation that overlaps with this time
    const occupiedTablesCount = await this.prisma.reservation.count({
      where: {
        date: dateObj,
        timeSlot: { in: overlappingSlots },
        regionId: dto.regionId,
        OR: [
          { status: ReservationStatus.CONFIRMED },
          {
            status: ReservationStatus.LOCKED,
            lockedUntil: { gt: now },
          },
        ],
      },
    });

    const availableTables = region.tables - occupiedTablesCount;

    if (availableTables <= 0) {
      return {
        available: false,
        reason: `No tables available in ${region.displayName} for this time slot`,
      };
    }

    return {
      available: true,
      availableTables,
    };
  }

  /**
   * Get alternative slots when the desired one is not available
   */
  async getAlternatives(
    dto: GetAlternativesDto,
  ): Promise<AlternativeSlotDto[]> {
    this.logger.log(`Getting alternatives for: ${dto.date} ${dto.timeSlot}`);

    const alternatives: AlternativeSlotDto[] = [];
    const dateObj = new Date(dto.date);

    // Get valid regions for this party configuration
    const validRegions = await this.regionValidator.getValidRegions(
      dto.partySize,
      dto.childrenCount,
      dto.hasSmokingRequest,
    );

    // Strategy 1: Same time slot, different regions
    for (const region of validRegions) {
      const checkResult = await this.checkAvailability({
        date: dto.date,
        timeSlot: dto.timeSlot,
        regionId: region.id,
        partySize: dto.partySize,
        childrenCount: dto.childrenCount,
        hasSmokingRequest: dto.hasSmokingRequest,
      });

      alternatives.push({
        date: dto.date,
        timeSlot: dto.timeSlot,
        region: region,
        available: checkResult.available,
        availableTables: checkResult.availableTables,
      });
    }

    // Strategy 2: Same day, different time slots
    for (const timeSlot of TIME_SLOTS) {
      if (timeSlot === dto.timeSlot) continue;

      for (const region of validRegions) {
        const checkResult = await this.checkAvailability({
          date: dto.date,
          timeSlot,
          regionId: region.id,
          partySize: dto.partySize,
          childrenCount: dto.childrenCount,
          hasSmokingRequest: dto.hasSmokingRequest,
        });

        alternatives.push({
          date: dto.date,
          timeSlot,
          region: region,
          available: checkResult.available,
          availableTables: checkResult.availableTables,
        });
      }
    }

    // Strategy 3: Adjacent days, same time slot
    const adjacentDates = this.getAdjacentDates(dateObj);
    for (const adjacentDate of adjacentDates) {
      const dateStr = adjacentDate.toISOString().split('T')[0];

      try {
        // Validate the adjacent date is in range
        new DateTimeSlot(dateStr, dto.timeSlot);

        for (const region of validRegions) {
          const checkResult = await this.checkAvailability({
            date: dateStr,
            timeSlot: dto.timeSlot,
            regionId: region.id,
            partySize: dto.partySize,
            childrenCount: dto.childrenCount,
            hasSmokingRequest: dto.hasSmokingRequest,
          });

          alternatives.push({
            date: dateStr,
            timeSlot: dto.timeSlot,
            region: region,
            available: checkResult.available,
            availableTables: checkResult.availableTables,
          });
        }
      } catch (error) {
        // Date is out of allowed range, skip
        continue;
      }
    }

    // Sort alternatives: available first, then by date and time
    return alternatives.sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  }

  /**
   * Get dates adjacent to the given date (previous and next day)
   */
  private getAdjacentDates(date: Date): Date[] {
    const prevDay = new Date(date);
    prevDay.setDate(date.getDate() - 1);

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    return [prevDay, nextDay];
  }
}
