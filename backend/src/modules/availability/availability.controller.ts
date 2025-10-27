import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UsePipes,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import {
  CheckAvailabilityDto,
  CheckAvailabilityResponseDto,
} from './dto/check-availability.dto';
import {
  GetAlternativesDto,
  AlternativeSlotDto,
} from './dto/get-alternatives.dto';

/**
 * Controller for availability-related endpoints
 */
@ApiTags('availability')
@Controller('api/availability')
@UsePipes(new NestValidationPipe({ transform: true }))
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * GET /api/availability/slots?date=2025-07-24
   * Get all available time slots for a specific date
   */
  @Get('slots')
  @ApiOperation({
    summary: 'Get available time slots for a date',
    description:
      'Returns all time slots for a specific date with their available regions. ' +
      'This is typically the first endpoint to call when making a reservation.',
  })
  @ApiQuery({
    name: 'date',
    description: 'Date to check availability for (YYYY-MM-DD format)',
    example: '2025-07-24',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of time slots with available regions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timeSlot: { type: 'string', example: '19:00' },
          availableRegions: {
            type: 'array',
            items: { type: 'string', enum: ['MAIN_HALL', 'BAR', 'RIVERSIDE', 'RIVERSIDE_SMOKING'] },
            example: ['MAIN_HALL', 'RIVERSIDE'],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  async getAvailableSlots(@Query('date') date: string) {
    return this.availabilityService.getAvailableSlots(date);
  }

  /**
   * POST /api/availability/check
   * Check if a specific slot is available
   */
  @Post('check')
  @ApiOperation({
    summary: 'Check if a specific slot is available',
    description:
      'Validates if a specific time slot and region combination is available for the given party configuration. ' +
      'Checks business rules like capacity, children restrictions, and smoking requirements.',
  })
  @ApiResponse({
    status: 200,
    description: 'Availability check result',
    type: CheckAvailabilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async checkAvailability(
    @Body() dto: CheckAvailabilityDto,
  ): Promise<CheckAvailabilityResponseDto> {
    return this.availabilityService.checkAvailability(dto);
  }

  /**
   * GET /api/availability/alternatives
   * Get alternative slots when desired slot is unavailable
   */
  @Get('alternatives')
  @ApiOperation({
    summary: 'Get alternative time slots',
    description:
      'When the desired slot is unavailable, this endpoint suggests alternatives. ' +
      'Returns slots from the same time (different regions), same day (different times), ' +
      'and adjacent days (same time).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of alternative available slots',
    type: [AlternativeSlotDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  async getAlternatives(
    @Query() dto: GetAlternativesDto,
  ): Promise<AlternativeSlotDto[]> {
    return this.availabilityService.getAlternatives(dto);
  }
}
