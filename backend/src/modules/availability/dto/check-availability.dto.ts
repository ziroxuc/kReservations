import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Region } from '@prisma/client';
import {
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
} from '../../../common/constants/business-rules.constants';

/**
 * DTO for checking availability of a specific slot
 */
export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'Reservation date in ISO format (YYYY-MM-DD)',
    example: '2025-07-24',
    type: String,
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Desired time slot (30-minute intervals)',
    example: '19:00',
    enum: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
  })
  @IsString()
  timeSlot: string;

  @ApiProperty({
    description: 'Restaurant region ID (UUID). Use GET /regions to retrieve available region IDs.',
    example: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
    examples: {
      MAIN_HALL: {
        value: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
        summary: 'Main Hall (4 tables, 12 people/table)',
      },
      BAR: {
        value: '6805ddaa-08c8-4daf-acdd-3eeb646656eb',
        summary: 'Bar (6 tables, 4 people/table)',
      },
      RIVERSIDE: {
        value: '495eb4c6-09db-4b22-893b-5aa9549f15c6',
        summary: 'Riverside (5 tables, 8 people/table)',
      },
      RIVERSIDE_SMOKING: {
        value: 'e9a2fa91-ab34-4d15-9a43-e0201e5e5a50',
        summary: 'Riverside Smoking (4 tables, 6 people/table)',
      },
    },
  })
  @IsString()
  regionId: string;

  @ApiProperty({
    description: 'Total number of people in the party',
    minimum: MIN_PARTY_SIZE,
    maximum: MAX_PARTY_SIZE,
    example: 4,
  })
  @IsInt()
  @Min(MIN_PARTY_SIZE)
  @Max(MAX_PARTY_SIZE)
  partySize: number;

  @ApiProperty({
    description: 'Number of children in the party',
    minimum: 0,
    example: 1,
  })
  @IsInt()
  @Min(0)
  childrenCount: number;

  @ApiProperty({
    description: 'Whether anyone in the party wants to smoke',
    example: false,
  })
  @IsBoolean()
  hasSmokingRequest: boolean;
}

/**
 * Response DTO for availability check
 */
export class CheckAvailabilityResponseDto {
  @ApiProperty({
    description: 'Whether the slot is available for the given configuration',
    example: true,
  })
  available: boolean;

  @ApiProperty({
    description: 'Reason why the slot is unavailable (only present if available=false)',
    example: 'BAR does not allow children.',
    required: false,
  })
  reason?: string;

  @ApiProperty({
    description: 'Number of available tables (only present if available=true)',
    example: 3,
    required: false,
  })
  availableTables?: number;
}
