import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Mission, MissionFilter, MissionLog, MapData } from '../models/mission.model';
import { tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class MissionService {
    private currentMission$ = new BehaviorSubject<Mission | null>(null);
    private missionHistory$ = new BehaviorSubject<Mission[]>([]);
    private readonly apiUrl = `${environment.apiUrl}/missions`;

    constructor(private http: HttpClient) {
        this.pollCurrentMission();
    }

    private pollCurrentMission(): void {
        // Poll current mission every 5 seconds
        setInterval(() => {
            this.http.get<Mission | null>(`${this.apiUrl}/current`).subscribe(mission => {
                if (mission && mission.logs) {
                    this.currentMission$.next(mission);
                }
            });
        }, 5000);
    }

    private createParams(filter?: MissionFilter): HttpParams {
        let params = new HttpParams();
        if (filter) {
            if (filter.startDate) {
                params = params.set('startDate', filter.startDate.toISOString());
            }
            if (filter.endDate) {
                params = params.set('endDate', filter.endDate.toISOString());
            }
            if (filter.robotId) {
                params = params.set('robotId', filter.robotId);
            }
            if (filter.status) {
                params = params.set('status', filter.status);
            }
        }
        return params;
    }

    public getCurrentMission(): Observable<Mission | null> {
        return this.currentMission$.asObservable();
    }

    public getMissionHistory(): Observable<Mission[]> {
        return this.missionHistory$.asObservable();
    }

    public loadMissionHistory(filter?: MissionFilter): Observable<Mission[]> {
        return this.http.get<Mission[]>(this.apiUrl, {
            params: this.createParams(filter)
        }).pipe(
            tap(missions => this.missionHistory$.next(missions))
        );
    }

    public getMissionById(id: string): Observable<Mission> {
        return this.http.get<Mission>(`${this.apiUrl}/${id}`);
    }

    public saveMap(missionId: string, mapData: MapData): Observable<void> {
        return this.http.post<void>(
            `${this.apiUrl}/${missionId}/map`,
            mapData
        );
    }

    public loadMap(missionId: string): Observable<MapData> {
        return this.http.get<MapData>(
            `${this.apiUrl}/${missionId}/map`
        );
    }

    public downloadLogs(missionId: string): Observable<MissionLog[]> {
        return this.http.get<MissionLog[]>(
            `${this.apiUrl}/${missionId}/logs`
        );
    }

    public filterMissions(filter: MissionFilter): Observable<Mission[]> {
        return this.http.get<Mission[]>(this.apiUrl, {
            params: this.createParams(filter)
        });
    }

    public startNewMission(robotIds: string[]): Observable<Mission> {
        return this.http.post<Mission>(`${this.apiUrl}`, { robotIds }).pipe(
            tap(mission => this.currentMission$.next(mission))
        );
    }

    public endCurrentMission(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/current/end`, {}).pipe(
            tap(() => {
                const mission = this.currentMission$.value;
                if (mission) {
                    mission.endTime = new Date().toISOString();
                    mission.status = 'completed';
                    mission.duration = this.calculateDuration(mission.startTime, mission.endTime);
                    
                    // Update mission history
                    const history = this.missionHistory$.value;
                    this.missionHistory$.next([...history, mission]);
                    
                    // Clear current mission
                    this.currentMission$.next(null);
                }
            })
        );
    }

    private calculateDuration(startTime: string, endTime: string): number {
        return (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
    }
}