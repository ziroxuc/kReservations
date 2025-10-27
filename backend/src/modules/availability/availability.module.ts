import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { RegionValidatorService } from '../../domain/services/region-validator.service';
import { RegionModule } from '../region/region.module';

/**
 * Availability Module
 * Handles checking reservation availability and alternatives
 */
@Module({
  imports: [RegionModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, RegionValidatorService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
