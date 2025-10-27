import {
  IsString,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Region } from '@prisma/client';
import {
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  PHONE_REGEX,
} from '../../../common/constants/business-rules.constants';

/**
 * DTO for creating a reservation
 */
export class CreateReservationDto {
  @ApiProperty({
    description: 'Reservation date (YYYY-MM-DD)',
    example: '2025-07-24',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Reservation time slot',
    example: '19:00',
    enum: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
  })
  @IsString()
  timeSlot: string;

  @ApiProperty({
    description: 'Full name of the customer making the reservation',
    example: 'John Doe',
  })
  @IsString()
  customerName: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Customer phone number in international format',
    example: '+1234567890',
    pattern: '^\\+?[1-9]\\d{1,14}$',
  })
  @Matches(PHONE_REGEX, {
    message:
      'Phone number must be in international format (e.g., +1234567890)',
  })
  phone: string;

  @ApiProperty({
    description: 'Total number of people in the reservation',
    minimum: MIN_PARTY_SIZE,
    maximum: MAX_PARTY_SIZE,
    example: 4,
  })
  @IsInt()
  @Min(MIN_PARTY_SIZE)
  @Max(MAX_PARTY_SIZE)
  partySize: number;

  @ApiProperty({
    description: 'Restaurant region ID (UUID). Must match the region locked in the previous step. Use GET /regions to retrieve available region IDs.',
    example: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
    examples: {
      MAIN_HALL: {
        value: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
        summary: 'Main Hall',
      },
      BAR: {
        value: '6805ddaa-08c8-4daf-acdd-3eeb646656eb',
        summary: 'Bar',
      },
      RIVERSIDE: {
        value: '495eb4c6-09db-4b22-893b-5aa9549f15c6',
        summary: 'Riverside',
      },
      RIVERSIDE_SMOKING: {
        value: 'e9a2fa91-ab34-4d15-9a43-e0201e5e5a50',
        summary: 'Riverside Smoking',
      },
    },
  })
  @IsString()
  regionId: string;

  @ApiProperty({
    description: 'Number of children in the party',
    minimum: 0,
    example: 1,
  })
  @IsInt()
  @Min(0)
  childrenCount: number;

  @ApiProperty({
    description: 'Whether anyone in the party wants to smoke (requires RIVERSIDE_SMOKING region)',
    example: false,
  })
  @IsBoolean()
  hasSmokingRequest: boolean;

  @ApiProperty({
    description: 'Whether there is a birthday celebration',
    example: true,
  })
  @IsBoolean()
  hasBirthday: boolean;

  @ApiProperty({
    description: 'Name of the birthday person (required if hasBirthday=true)',
    example: 'Jane Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  birthdayName?: string;

  @ApiProperty({
    description: 'Session ID from the lock operation (must match the lock sessionId)',
    example: 'unique-session-abc123',
  })
  @IsString()
  sessionId: string;
}
