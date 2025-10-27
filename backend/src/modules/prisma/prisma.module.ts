import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global Prisma Module
 * Makes PrismaService available throughout the application
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
