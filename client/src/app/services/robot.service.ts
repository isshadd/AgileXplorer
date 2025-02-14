import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RobotService {
  private apiUrl = `${environment.apiUrl}/robots`;

  constructor(private http: HttpClient) {}

  startMission(robotId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${robotId}/mission/start`, {});
  }

  stopMission(robotId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${robotId}/mission/stop`, {});
  }

  identify(robotId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${robotId}/identify`, {});
  }
}