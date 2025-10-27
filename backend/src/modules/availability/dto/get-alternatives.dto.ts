import {
  IsString,
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
 * DTO for getting alternative time slots
 */
export class GetAlternativesDto {
  @ApiProperty({
    description: 'Original desired reservation date (YYYY-MM-DD)',
    example: '2025-07-24',
    type: String,
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Original desired time slot',
    example: '19:00',
    enum: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
  })
  @IsString()
  timeSlot: string;

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
 * Alternative slot response
 */
export class AlternativeSlotDto {
  @ApiProperty({
    description: 'Alternative date',
    example: '2025-07-24',
  })
  date: string;

  @ApiProperty({
    description: 'Alternative time slot',
    example: '19:30',
  })
  timeSlot: string;

  @ApiProperty({
    description: 'Available region for this alternative',
  })
  region: Region;

  @ApiProperty({
    description: 'Whether this alternative is currently available',
    example: true,
  })
  available: boolean;

  @ApiProperty({
    description: 'Number of available tables',
    example: 2,
    required: false,
  })
  availableTables?: number;
}
