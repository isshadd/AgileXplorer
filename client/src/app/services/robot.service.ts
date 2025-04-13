import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RobotService {
  private apiUrl = `${environment.apiUrl}/robot`;

  constructor(private http: HttpClient) {}

  startMission(robotId: string): Observable<{ missionId: string }> {
    return this.http.post<{ missionId: string }>(`${this.apiUrl}/${robotId}/mission/start`, {});
  }

  stopMission(robotId: string): Observable<{ stoppedMissionId: string }> {
    return this.http.post<{ stoppedMissionId: string }>(`${this.apiUrl}/${robotId}/mission/stop`, {});
  }

  identify(robotId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${robotId}/identify`, {});
  }

  returnToBase(robotId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${robotId}/mission/return`, {});
  }

  // Méthode globale pour démarrer la mission de tous les robots
  startAllMissions(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/mission/start_all`, {});
  }

  // Méthode globale pour arrêter la mission de tous les robots
  stopAllMissions(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/mission/stop_all`, {});
  }

  // Méthode pour activer/désactiver le mode P2P
  toggleP2P(robotId: string, enable: boolean): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${robotId}/p2p`, { enable });
  }
}
