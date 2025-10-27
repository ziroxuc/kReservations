import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: Socket | null = null;
  private connected = signal<boolean>(false);

  // Subjects for events
  private availabilityChanged$ = new Subject<{date: string, timeSlot: string, region: string}>();
  private lockExpired$ = new Subject<{sessionId: string}>();

  readonly isConnected = this.connected.asReadonly();

  // Expose as observables
  readonly onAvailabilityChanged$ = this.availabilityChanged$.asObservable();
  readonly onLockExpired$ = this.lockExpired$.asObservable();

  connect(serverUrl: string): void {
    if (this.socket?.connected) return;

    this.socket = io(`${serverUrl}/reservations`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully!');
      console.log('Socket ID:', this.socket?.id);
      this.connected.set(true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.connected.set(false);
    });

    this.socket.on('availability:changed', (data) => {
      console.log('📡 WebSocket: availability:changed received', data);
      this.availabilityChanged$.next(data);
    });

    this.socket.on('lock:expired', (data) => {
      console.log('⏰ WebSocket: lock:expired received', data);
      this.lockExpired$.next(data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });
  }

  subscribeToDate(date: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected, cannot subscribe to date:', date);
      return;
    }
    console.log('📤 Subscribing to date availability:', date);
    this.socket.emit('subscribe:availability', { date });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.connected.set(false);
  }
}
