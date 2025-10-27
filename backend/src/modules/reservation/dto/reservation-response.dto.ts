import { ApiProperty } from '@nestjs/swagger';
import { Region, ReservationStatus } from '@prisma/client';

/**
 * Response DTO for reservation data
 */
export class ReservationResponseDto {
  @ApiProperty({
    description: 'Unique reservation identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Reservation date',
    example: '2025-07-24T00:00:00.000Z',
  })
  date: Date;

  @ApiProperty({
    description: 'Reservation time slot',
    example: '19:00',
  })
  timeSlot: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  customerName: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'john@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+1234567890',
  })
  phone: string;

  @ApiProperty({
    description: 'Party size',
    example: 4,
  })
  partySize: number;

  @ApiProperty({
    description: 'Restaurant region details',
    required: false,
  })
  region?: Region;

  @ApiProperty({
    description: 'Restaurant region ID',
    example: '73d5aa2b-026f-4f1b-b189-ad2ea8b8167d',
  })
  regionId: string;

  @ApiProperty({
    description: 'Number of children',
    example: 1,
  })
  childrenCount: number;

  @ApiProperty({
    description: 'Has smoking request',
    example: false,
  })
  hasSmokingRequest: boolean;

  @ApiProperty({
    description: 'Has birthday celebration',
    example: true,
  })
  hasBirthday: boolean;

  @ApiProperty({
    description: 'Birthday person name',
    example: 'Jane Doe',
    required: false,
  })
  birthdayName?: string;

  @ApiProperty({
    description: 'Reservation status',
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
  })
  status: ReservationStatus;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-07-24T18:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-07-24T18:30:00.000Z',
  })
  updatedAt: Date;
}
