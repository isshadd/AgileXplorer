import { Injectable } from '@angular/core';
import io from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  public onMapData(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('MAP_DATA', (data: any) => {
        console.log('WebSocket: données MAP_DATA reçues', data.payload);
        observer.next(data.payload);
      });

      return () => {
        this.socket.off('MAP_DATA');
      };
    });
  }

  public onBatteryData(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('BATTERY_DATA', (data: any) => {
        observer.next(data.payload);
      });
  
      return () => {
        this.socket.off('BATTERY_DATA');
      };
    });
  }

  public emit(event: string, data: any): void {
    this.socket.emit(event, {
      type: event,
      payload: data
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
