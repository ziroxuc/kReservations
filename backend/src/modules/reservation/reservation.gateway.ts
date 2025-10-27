import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Region } from '@prisma/client';

/**
 * WebSocket Gateway for real-time reservation updates
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : '*',
    credentials: true,
  },
  namespace: 'reservations',
})
export class ReservationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ReservationGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to availability updates for a specific date
   */
  @SubscribeMessage('subscribe:availability')
  handleSubscribeToAvailability(
    client: Socket,
    payload: { date: string },
  ): { subscribed: boolean; date: string } {
    const room = `availability:${payload.date}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);

    return {
      subscribed: true,
      date: payload.date,
    };
  }

  /**
   * Unsubscribe from availability updates
   */
  @SubscribeMessage('unsubscribe:availability')
  handleUnsubscribeFromAvailability(
    client: Socket,
    payload: { date: string },
  ): { unsubscribed: boolean; date: string } {
    const room = `availability:${payload.date}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);

    return {
      unsubscribed: true,
      date: payload.date,
    };
  }

  /**
   * Notify all subscribed clients about availability change
   */
  notifyAvailabilityChange(date: string, timeSlot: string, regionId: string) {
    const room = `availability:${date}`;
    const payload = {
      date,
      timeSlot,
      regionId,
      timestamp: new Date().toISOString(),
    };

    this.server.to(room).emit('availability:changed', payload);
    this.logger.log(
      `Emitted availability:changed to ${room}: ${timeSlot} region ${regionId}`,
    );
  }

  /**
   * Notify client that their lock has expired
   */
  notifyLockExpired(sessionId: string) {
    const payload = {
      sessionId,
      timestamp: new Date().toISOString(),
    };

    this.server.emit('lock:expired', payload);
    this.logger.log(`Emitted lock:expired for session: ${sessionId}`);
  }

  /**
   * Broadcast general availability update
   */
  broadcastAvailabilityUpdate() {
    this.server.emit('availability:update', {
      timestamp: new Date().toISOString(),
    });
    this.logger.log('Broadcasted general availability update');
  }
}
