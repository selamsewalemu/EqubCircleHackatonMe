import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';

export interface RealtimeEvent {
  type: string;
  data?: unknown;
}

const HUB_EVENTS = [
  'circleCreated',
  'memberJoined',
  'circleStarted',
  'paymentRecorded',
  'payoutCompleted',
] as const;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private connection: HubConnection | null = null;
  private startedForToken = '';

  private eventsSubject = new Subject<RealtimeEvent>();
  readonly events$ = this.eventsSubject.asObservable();

  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  readonly isConnected$ = this.isConnectedSubject.asObservable();

  connect(): void {
    const token = localStorage.getItem('ekub_token');
    if (!token || this.startedForToken === token) return;
    this.startedForToken = token;

    this.connection = new HubConnectionBuilder()
      .withUrl('/hubs/notifications', {
        accessTokenFactory: () => localStorage.getItem('ekub_token') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    for (const type of HUB_EVENTS) {
      this.connection.on(type, (data: unknown) =>
        this.eventsSubject.next({ type, data }),
      );
    }

    this.connection.onclose(() => {
      this.startedForToken = '';
      this.isConnectedSubject.next(false);
    });

    this.connection.onreconnecting(() => {
      this.isConnectedSubject.next(false);
    });

    this.connection.onreconnected(() => {
      this.isConnectedSubject.next(true);
    });

    this.connection
      .start()
      .then(() => this.isConnectedSubject.next(true))
      .catch(() => {
        this.startedForToken = '';
        this.isConnectedSubject.next(false);
      });
  }

  disconnect(): void {
    const connection = this.connection;
    this.connection = null;
    this.startedForToken = '';
    this.isConnectedSubject.next(false);
    if (connection) {
      connection.stop().catch(() => {});
    }
  }
}
