import { Injectable, OnDestroy } from '@angular/core';
import { Manager } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable, ReplaySubject } from 'rxjs';
import {
  RobotStatesMessage,
  MissionLogMessage,
  ErrorMessage
} from '../interfaces/websocket.interface';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: any;
  private reconnectionAttempts = 0;
  private readonly MAX_RECONNECTION_ATTEMPTS = 5;
  private readonly RECONNECTION_INTERVAL = 3000;

  private robotStatesSubject = new ReplaySubject<RobotStatesMessage['payload']>(1);
  private missionLogSubject = new ReplaySubject<MissionLogMessage['payload']>(1);
  private errorSubject = new ReplaySubject<ErrorMessage['payload']>(1);

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const manager = new Manager(environment.wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.RECONNECTION_INTERVAL,
      reconnectionAttempts: this.MAX_RECONNECTION_ATTEMPTS,
      timeout: 10000
    });

    this.socket = manager.socket('/');
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectionAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.reconnectionAttempts++;
      
      if (this.reconnectionAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        this.cleanup();
      }
    });

    this.socket.on('ROBOT_STATES', (message: RobotStatesMessage) => {
      this.robotStatesSubject.next(message.payload);
    });

    this.socket.on('MISSION_LOG', (message: MissionLogMessage) => {
      this.missionLogSubject.next(message.payload);
    });

    this.socket.on('error', (message: ErrorMessage) => {
      this.errorSubject.next(message.payload);
      console.error('WebSocket error:', message.payload);
    });
  }

  private cleanup(): void {
    if (this.socket) {
      // Remove all listeners
      this.socket.removeAllListeners();
      // Disconnect the socket
      this.socket.disconnect();
      this.socket = null;
    }

    // Complete all subjects
    this.robotStatesSubject.complete();
    this.missionLogSubject.complete();
    this.errorSubject.complete();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  sendMissionCommand(command: 'START' | 'STOP' | 'RETURN', robotIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('mission_command', {
        type: 'MISSION_COMMAND',
        payload: { type: command, robots: robotIds }
      });
    }
  }

  setWheelMode(robotId: string, mode: 'ackerman' | 'differential'): void {
    if (this.socket?.connected) {
      this.socket.emit('wheel_mode', {
        type: 'WHEEL_MODE',
        payload: { robotId, mode }
      });
    }
  }

  sendP2PCommand(command: 'ENABLE' | 'DISABLE', robotIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('p2p_command', {
        type: 'P2P_COMMAND',
        payload: { type: command, robots: robotIds }
      });
    }
  }

  getRobotStates(): Observable<RobotStatesMessage['payload']> {
    return this.robotStatesSubject.asObservable();
  }

  getMissionLogs(): Observable<MissionLogMessage['payload']> {
    return this.missionLogSubject.asObservable();
  }

  getErrors(): Observable<ErrorMessage['payload']> {
    return this.errorSubject.asObservable();
  }
}