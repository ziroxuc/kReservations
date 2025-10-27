import { IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Region } from '@prisma/client';

/**
 * DTO for locking a time slot
 */
export class LockSlotDto {
  @ApiProperty({
    description: 'Date to lock the slot for (YYYY-MM-DD)',
    example: '2025-07-24',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Time slot to lock',
    example: '19:00',
    enum: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
  })
  @IsString()
  timeSlot: string;

  @ApiProperty({
    description: 'Restaurant region ID (UUID) to lock. Use GET /regions to retrieve available region IDs.',
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
    description: 'Unique session ID to identify the user (use UUID or similar)',
    example: 'unique-session-abc123',
  })
  @IsString()
  sessionId: string;
}

/**
 * Response DTO for lock operation
 */
export class LockResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the created lock',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  lockId: string;

  @ApiProperty({
    description: 'Timestamp when the lock expires (5 minutes from creation)',
    example: '2025-07-24T19:05:00.000Z',
  })
  expiresAt: Date;
}
