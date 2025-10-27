import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UsePipes,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { LockSlotDto, LockResponseDto } from './dto/lock-slot.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';

/**
 * Controller for reservation-related endpoints
 */
@ApiTags('reservations')
@Controller('api/reservations')
@UsePipes(new NestValidationPipe({ transform: true }))
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  /**
   * POST /api/reservations/lock
   * Lock a time slot temporarily
   */
  @Post('lock')
  @ApiOperation({
    summary: 'Lock a time slot temporarily',
    description:
      'Creates a temporary lock (5 minutes) on a time slot to prevent double bookings. ' +
      'The user must complete the reservation within this time using the same sessionId. ' +
      'Emits WebSocket event "availability:changed" to notify other users.',
  })
  @ApiResponse({
    status: 201,
    description: 'Slot locked successfully',
    type: LockResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Slot is already reserved or locked by another user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'This slot is already reserved or locked by another user' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async lockSlot(@Body() dto: LockSlotDto): Promise<LockResponseDto> {
    return this.reservationService.lockSlot(dto);
  }

  /**
   * POST /api/reservations
   * Create a confirmed reservation
   */
  @Post()
  @ApiOperation({
    summary: 'Create a confirmed reservation',
    description:
      'Confirms a reservation from an existing lock. The sessionId must match a valid, non-expired lock. ' +
      'Validates all business rules (capacity, children, smoking). ' +
      'Updates the lock status to CONFIRMED and emits WebSocket event "availability:changed".',
  })
  @ApiResponse({
    status: 201,
    description: 'Reservation created successfully',
    type: ReservationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no valid lock found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'No valid lock found for this session. Please lock the slot first.',
        },
      },
    },
  })
  async createReservation(
    @Body() dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.reservationService.createReservation(dto);
  }

  /**
   * GET /api/reservations
   * Get all reservations
   */
  @Get()
  @ApiOperation({
    summary: 'Get all reservations',
    description: 'Retrieves a list of all reservations. FOR ADMIN USE ONLY.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all reservations',
    type: [ReservationResponseDto],
  })
  async getAllReservations(): Promise<ReservationResponseDto[]> {
    return this.reservationService.getAllReservations();
  }

  /**
   * GET /api/reservations/by-email/:email
   * Get reservations by customer email
   */
  @Get('by-email/:email')
  @ApiOperation({
    summary: 'Get reservations by customer email',
    description: 'Retrieves all reservations associated with a specific customer email.',
  })
  @ApiParam({
    name: 'email',
    description: 'Customer email address',
    example: 'john@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'List of reservations for the specified email',
    type: [ReservationResponseDto],
  })
  async getReservationsByEmail(
    @Param('email') email: string,
  ): Promise<ReservationResponseDto[]> {
    return this.reservationService.getReservationsByEmail(email);
  }

  /**
   * GET /api/reservations/:id
   * Get reservation by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get reservation by ID',
    description: 'Retrieves the details of a specific reservation using its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Reservation unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation found',
    type: ReservationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Reservation not found' },
      },
    },
  })
  async getReservation(
    @Param('id') id: string,
  ): Promise<ReservationResponseDto> {
    return this.reservationService.getReservationById(id);
  }

  /**
   * DELETE /api/reservations/:id
   * Cancel a reservation
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel a reservation',
    description:
      'Cancels a reservation by its ID. ' +
      'This action releases the table and emits a WebSocket event to notify clients.',
  })
  @ApiParam({
    name: 'id',
    description: 'Reservation unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Reservation cancelled successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  async cancelReservation(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.reservationService.cancelReservation(id);
    return { message: 'Reservation cancelled successfully' };
  }

  /**
   * DELETE /api/reservations/lock/:sessionId
   * Release a lock
   */
  @Delete('lock/:sessionId')
  @ApiOperation({
    summary: 'Release a lock manually',
    description:
      'Manually releases a lock when the user cancels the reservation process. ' +
      'Deletes all locks associated with the sessionId and emits WebSocket events.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID used when creating the lock',
    example: 'unique-session-abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lock released successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lock released successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No lock found for this session',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'No lock found for this session' },
      },
    },
  })
  async releaseLock(
    @Param('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    await this.reservationService.releaseLock(sessionId);
    return { message: 'Lock released successfully' };
  }
}
