import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { ReservationGateway } from './reservation.gateway';
import { LockCleanupService } from './lock-cleanup.service';
import { RegionValidatorService } from '../../domain/services/region-validator.service';
import { RegionModule } from '../region/region.module';

/**
 * Reservation Module
 * Handles reservation creation, locking, and real-time updates
 */
@Module({
  imports: [ScheduleModule.forRoot(), RegionModule],
  controllers: [ReservationController],
  providers: [
    ReservationService,
    ReservationGateway,
    LockCleanupService,
    RegionValidatorService,
  ],
  exports: [ReservationService, ReservationGateway],
})
export class ReservationModule {}
