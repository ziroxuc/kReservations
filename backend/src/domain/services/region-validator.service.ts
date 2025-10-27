import { Injectable, BadRequestException } from '@nestjs/common';
import { Region } from '@prisma/client';
import { RegionService } from '../../modules/region/region.service';

/**
 * Domain service for validating region-specific business rules
 */
@Injectable()
export class RegionValidatorService {
  constructor(private readonly regionService: RegionService) {}

  /**
   * Validates if a party can be accommodated in the specified region
   */
  async validate(
    regionId: string,
    partySize: number,
    childrenCount: number,
    hasSmokingRequest: boolean,
  ): Promise<{ valid: boolean; reason?: string }> {
    const region = await this.regionService.getRegionById(regionId);

    // Check if region is active
    if (!region.isActive) {
      return {
        valid: false,
        reason: `${region.displayName} is currently not available.`,
      };
    }

    // Check capacity per table
    if (partySize > region.capacity) {
      return {
        valid: false,
        reason: `${region.displayName} can accommodate maximum ${region.capacity} people per table. Your party size is ${partySize}.`,
      };
    }

    // Check children policy
    if (childrenCount > 0 && !region.allowChildren) {
      return {
        valid: false,
        reason: `${region.displayName} does not allow children.`,
      };
    }

    // Check smoking policy
    if (hasSmokingRequest && !region.allowSmoking) {
      return {
        valid: false,
        reason: `${region.displayName} does not allow smoking. Please choose a smoking area.`,
      };
    }

    // If smoking is requested, must be a smoking region
    if (hasSmokingRequest && !region.allowSmoking) {
      return {
        valid: false,
        reason: 'Smoking is only allowed in designated smoking regions.',
      };
    }

    return { valid: true };
  }

  /**
   * Get all valid regions for a given party configuration
   */
  async getValidRegions(
    partySize: number,
    childrenCount: number,
    hasSmokingRequest: boolean,
  ): Promise<Region[]> {
    return this.regionService.getValidRegionsForParty(
      partySize,
      childrenCount,
      hasSmokingRequest,
    );
  }

  /**
   * Validate and throw exception if invalid
   */
  async validateOrThrow(
    regionId: string,
    partySize: number,
    childrenCount: number,
    hasSmokingRequest: boolean,
  ): Promise<void> {
    const validation = await this.validate(
      regionId,
      partySize,
      childrenCount,
      hasSmokingRequest,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }
  }
}
