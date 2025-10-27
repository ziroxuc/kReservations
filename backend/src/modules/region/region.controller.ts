import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RegionService } from './region.service';
import { Region } from '@prisma/client';

/**
 * Controller for region information endpoints
 */
@ApiTags('regions')
@Controller('regions')
export class RegionController {
  constructor(private readonly regionService: RegionService) { }

  /**
   * Get all active regions
   */
  @Get()
  @ApiOperation({
    summary: 'Get all active restaurant regions',
    description: `
      Returns a list of all active regions in the restaurant with their complete configuration.

      **Use this endpoint to:**
      - Get region IDs (UUIDs) for making reservations
      - See capacity per table and total number of tables
      - Check business rules (children allowed, smoking allowed)

      **Important**: You must use the \`id\` field (UUID) when locking tables or creating reservations.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'List of all active regions with their configurations',
    schema: {
      example: [
        {
          id: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
          name: 'MAIN_HALL',
          displayName: 'Main Hall',
          capacity: 12,
          tables: 4,
          allowChildren: true,
          allowSmoking: false,
          isActive: true,
          createdAt: '2025-10-22T20:26:16.140Z',
          updatedAt: '2025-10-22T20:26:16.140Z',
        },
      ],
    },
  })
  async getAllRegions(): Promise<Region[]> {
    return this.regionService.getAllRegions();
  }

  /**
   * Get region by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get region details by ID',
    description: 'Retrieve detailed information about a specific region using its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Region UUID',
    example: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
  })
  @ApiResponse({
    status: 200,
    description: 'Region details',
    schema: {
      example: {
        id: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
        name: 'MAIN_HALL',
        displayName: 'Main Hall',
        capacity: 12,
        tables: 4,
        allowChildren: true,
        allowSmoking: false,
        isActive: true,
        createdAt: '2025-10-22T20:26:16.140Z',
        updatedAt: '2025-10-22T20:26:16.140Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async getRegionById(@Param('id') id: string): Promise<Region> {
    return this.regionService.getRegionById(id);
  }
}
