import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegionValidatorService } from '../../domain/services/region-validator.service';
import { ReservationGateway } from './reservation.gateway';
import { LockSlotDto, LockResponseDto } from './dto/lock-slot.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import {
  LOCK_DURATION_MINUTES,
  getOverlappingTimeSlots,
} from '../../common/constants/business-rules.constants';
import { DateTimeSlot } from '../../domain/value-objects/date-time-slot.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';

/**
 * Service for managing reservations
 */
@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly regionValidator: RegionValidatorService,
    private readonly gateway: ReservationGateway,
  ) {}

  /**
   * Lock a slot for a temporary period
   */
  async lockSlot(dto: LockSlotDto): Promise<LockResponseDto> {
    this.logger.log(
      `Locking slot: ${dto.date} ${dto.timeSlot} region ${dto.regionId} for session ${dto.sessionId}`,
    );

    // Validate date and time slot
    const dateTimeSlot = new DateTimeSlot(dto.date, dto.timeSlot);
    const dateObj = dateTimeSlot.getDate();

    // Check if there are available tables in this slot
    // Must consider overlapping reservations (2-hour duration)
    const now = new Date();
    const region = await this.prisma.region.findUnique({
      where: { id: dto.regionId },
    });

    if (!region) {
      throw new BadRequestException('Invalid region');
    }

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

    if (occupiedTablesCount >= region.tables) {
      throw new ConflictException(
        'No tables available in this region for the selected time slot',
      );
    }

    // Calculate lock expiration
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);

    // Create lock
    const reservation = await this.prisma.reservation.create({
      data: {
        date: dateObj,
        timeSlot: dto.timeSlot,
        regionId: dto.regionId,
        status: ReservationStatus.LOCKED,
        lockedBy: dto.sessionId,
        lockedUntil,
        // Temporary placeholder data (will be updated on confirmation)
        customerName: 'PENDING',
        email: 'pending@temp.com',
        phone: '+00000000000',
        partySize: 1,
        childrenCount: 0,
        hasSmokingRequest: false,
        hasBirthday: false,
      },
    });

    // Notify via WebSocket
    this.gateway.notifyAvailabilityChange(dto.date, dto.timeSlot, dto.regionId);

    this.logger.log(`Slot locked successfully: ${reservation.id}`);

    return {
      lockId: reservation.id,
      expiresAt: lockedUntil,
    };
  }

  /**
   * Create a confirmed reservation from a locked slot
   */
  async createReservation(
    dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    this.logger.log(`Creating reservation for session: ${dto.sessionId}`);

    // Validate value objects
    const dateTimeSlot = new DateTimeSlot(dto.date, dto.timeSlot);
    const email = new Email(dto.email);
    const phone = new PhoneNumber(dto.phone);

    const dateObj = dateTimeSlot.getDate();

    // Validate business rules
    await this.regionValidator.validateOrThrow(
      dto.regionId,
      dto.partySize,
      dto.childrenCount,
      dto.hasSmokingRequest,
    );

    // Additional validations
    if (dto.childrenCount > dto.partySize) {
      throw new BadRequestException('Children count cannot exceed party size');
    }

    if (dto.hasBirthday && !dto.birthdayName) {
      throw new BadRequestException(
        'Birthday name is required when hasBirthday is true',
      );
    }

    // Find the lock for this session
    const now = new Date();
    const lock = await this.prisma.reservation.findFirst({
      where: {
        date: dateObj,
        timeSlot: dto.timeSlot,
        regionId: dto.regionId,
        status: ReservationStatus.LOCKED,
        lockedBy: dto.sessionId,
        lockedUntil: { gt: now },
      },
    });

    if (!lock) {
      throw new BadRequestException(
        'No valid lock found for this session. Please lock the slot first.',
      );
    }

    // Update the reservation with actual data
    const reservation = await this.prisma.reservation.update({
      where: { id: lock.id },
      data: {
        customerName: dto.customerName,
        email: email.getValue(),
        phone: phone.getValue(),
        partySize: dto.partySize,
        childrenCount: dto.childrenCount,
        hasSmokingRequest: dto.hasSmokingRequest,
        hasBirthday: dto.hasBirthday,
        birthdayName: dto.birthdayName,
        status: ReservationStatus.CONFIRMED,
        lockedBy: null,
        lockedUntil: null,
      },
      include: {
        region: true,
      },
    });

    // Notify via WebSocket
    this.gateway.notifyAvailabilityChange(
      dto.date,
      dto.timeSlot,
      dto.regionId,
    );

    this.logger.log(`Reservation confirmed: ${reservation.id}`);

    return this.mapToResponseDto(reservation);
  }

  /**
   * Get reservation by ID
   */
  async getReservationById(id: string): Promise<ReservationResponseDto> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { region: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return this.mapToResponseDto(reservation);
  }

  /**
   * Get all reservations
   */
  async getAllReservations(): Promise<ReservationResponseDto[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { status: ReservationStatus.CONFIRMED },
      include: { region: true },
      orderBy: { createdAt: 'desc' },
    });
    return reservations.map(r => this.mapToResponseDto(r));
  }

  /**
   * Get reservations by customer email
   */
  async getReservationsByEmail(
    email: string,
  ): Promise<ReservationResponseDto[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        email: new Email(email).getValue(),
        status: ReservationStatus.CONFIRMED,
      },
      include: { region: true },
      orderBy: { date: 'desc' },
    });
    return reservations.map(r => this.mapToResponseDto(r));
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(id: string): Promise<void> {
    this.logger.log(`Cancelling reservation: ${id}`);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    await this.prisma.reservation.delete({
      where: { id },
    });

    // Notify via WebSocket
    const dateStr = reservation.date.toISOString().split('T')[0];
    this.gateway.notifyAvailabilityChange(
      dateStr,
      reservation.timeSlot,
      reservation.regionId,
    );

    this.logger.log(`Reservation cancelled: ${id}`);
  }

  /**
   * Release a lock (cancel before confirmation)
   */
  async releaseLock(sessionId: string): Promise<void> {
    this.logger.log(`Releasing lock for session: ${sessionId}`);

    const locks = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.LOCKED,
        lockedBy: sessionId,
      },
    });

    if (locks.length === 0) {
      throw new NotFoundException('No lock found for this session');
    }

    // Delete all locks for this session
    await this.prisma.reservation.deleteMany({
      where: {
        status: ReservationStatus.LOCKED,
        lockedBy: sessionId,
      },
    });

    // Notify via WebSocket for each released lock
    for (const lock of locks) {
      const dateStr = lock.date.toISOString().split('T')[0];
      this.gateway.notifyAvailabilityChange(
        dateStr,
        lock.timeSlot,
        lock.regionId,
      );
    }

    this.logger.log(
      `Released ${locks.length} lock(s) for session: ${sessionId}`,
    );
  }

  /**
   * Map Prisma model to response DTO
   */
  private mapToResponseDto(reservation: any): ReservationResponseDto {
    return {
      id: reservation.id,
      date: reservation.date.toISOString().split('T')[0],
      timeSlot: reservation.timeSlot,
      customerName: reservation.customerName,
      email: reservation.email,
      phone: reservation.phone,
      partySize: reservation.partySize,
      region: reservation.region,
      regionId: reservation.regionId,
      childrenCount: reservation.childrenCount,
      hasSmokingRequest: reservation.hasSmokingRequest,
      hasBirthday: reservation.hasBirthday,
      birthdayName: reservation.birthdayName,
      status: reservation.status,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }
}
