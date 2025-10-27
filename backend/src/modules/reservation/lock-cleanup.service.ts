import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationGateway } from './reservation.gateway';

/**
 * Service for cleaning up expired locks
 * Runs as a scheduled task every minute
 */
@Injectable()
export class LockCleanupService {
  private readonly logger = new Logger(LockCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ReservationGateway,
  ) {}

  /**
   * Clean expired locks every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanExpiredLocks() {
    const now = new Date();

    try {
      // Find all expired locks
      const expiredLocks = await this.prisma.reservation.findMany({
        where: {
          status: ReservationStatus.LOCKED,
          lockedUntil: { lte: now },
        },
      });

      if (expiredLocks.length === 0) {
        return;
      }

      this.logger.log(`Found ${expiredLocks.length} expired lock(s)`);

      // Delete expired locks
      await this.prisma.reservation.deleteMany({
        where: {
          status: ReservationStatus.LOCKED,
          lockedUntil: { lte: now },
        },
      });

      // Notify via WebSocket
      for (const lock of expiredLocks) {
        const dateStr = lock.date.toISOString().split('T')[0];

        // Notify about availability change
        this.gateway.notifyAvailabilityChange(
          dateStr,
          lock.timeSlot,
          lock.regionId,
        );

        // Notify the specific session that their lock expired
        if (lock.lockedBy) {
          this.gateway.notifyLockExpired(lock.lockedBy);
        }
      }

      this.logger.log(`Cleaned ${expiredLocks.length} expired lock(s)`);
    } catch (error) {
      this.logger.error('Error cleaning expired locks:', error);
    }
  }

  /**
   * Manual cleanup (for testing)
   */
  async cleanExpiredLocksNow(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.reservation.deleteMany({
      where: {
        status: ReservationStatus.LOCKED,
        lockedUntil: { lte: now },
      },
    });

    this.logger.log(`Manually cleaned ${result.count} expired lock(s)`);

    return result.count;
  }
}
