import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Region } from '@prisma/client';

/**
 * Service for managing restaurant regions
 */
@Injectable()
export class RegionService {
  private readonly logger = new Logger(RegionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active regions
   */
  async getAllRegions(): Promise<Region[]> {
    return this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get region by ID
   */
  async getRegionById(id: string): Promise<Region> {
    const region = await this.prisma.region.findUnique({
      where: { id },
    });

    if (!region) {
      throw new NotFoundException(`Region with ID ${id} not found`);
    }

    return region;
  }

  /**
   * Get region by name
   */
  async getRegionByName(name: string): Promise<Region> {
    const region = await this.prisma.region.findUnique({
      where: { name },
    });

    if (!region) {
      throw new NotFoundException(`Region with name ${name} not found`);
    }

    return region;
  }

  /**
   * Get regions that match party requirements
   */
  async getValidRegionsForParty(
    partySize: number,
    childrenCount: number,
    hasSmokingRequest: boolean,
  ): Promise<Region[]> {
    const regions = await this.getAllRegions();

    return regions.filter((region) => {
      // Check capacity per table
      if (partySize > region.capacity) {
        return false;
      }

      // Check children policy
      if (childrenCount > 0 && !region.allowChildren) {
        return false;
      }

      // Check smoking policy
      if (hasSmokingRequest && !region.allowSmoking) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate total capacity for a region (tables * capacity per table)
   */
  getTotalCapacity(region: Region): number {
    return region.tables * region.capacity;
  }
}
