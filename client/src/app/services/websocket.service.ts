import { Injectable } from '@angular/core';
import io from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface Position {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: ReturnType<typeof io>;

  constructor() {
    this.socket = io(environment.apiUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connecté');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket déconnecté');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket erreur:', error);
    });
  }

  public onRobotPosition(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('ROBOT_POSITION', (data: any) => {
        observer.next(data.payload);
      });

      return () => {
        this.socket.off('ROBOT_POSITION');
      };
    });
  }

  public sendStartPosition(robotId: string, position: Position): void {
    this.socket.emit('set_start_position', {
      type: 'SET_START_POSITION',
      payload: {
        robotId,
        position
      }
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
