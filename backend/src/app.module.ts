import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RegionModule } from './modules/region/region.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { ReservationModule } from './modules/reservation/reservation.module';

/**
 * Main Application Module
 * Orchestrates all feature modules
 */
@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Core modules
    PrismaModule,
    RegionModule,

    // Feature modules
    AvailabilityModule,
    ReservationModule,
  ],
})
export class AppModule {}
