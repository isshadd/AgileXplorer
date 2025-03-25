import { Injectable } from '@angular/core';
import io from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: ReturnType<typeof io>;
  private isController: boolean = false;
  private clientId: string = '';
  private clientCount: number = 1;

  constructor() {
    this.socket = io(environment.apiUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connecté');
      this.clientId = this.socket.id || `client-${Date.now()}`;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket déconnecté');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket erreur:', error);
    });
    
    // Réception du statut de contrôleur
    this.socket.on('CONTROLLER_STATUS', (data: {isController: boolean}) => {
      this.isController = data.isController;
      console.log(`Statut de contrôleur: ${this.isController ? 'Actif' : 'Spectateur'}`);
    });
  }
  
  public getClientId(): string {
    return this.clientId;
  }
  
  public isControllerClient(): boolean {
    return this.isController;
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
  
  public onClientCountUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('CLIENT_COUNT', (data: any) => {
        this.clientCount = data.count;
        console.log(`Nombre de clients connectés: ${this.clientCount}`);
        observer.next({
          count: this.clientCount,
          isController: this.isController
        });
      });

      return () => {
        this.socket.off('CLIENT_COUNT');
      };
    });
  }
  
  public getClientCount(): number {
    return this.clientCount;
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
