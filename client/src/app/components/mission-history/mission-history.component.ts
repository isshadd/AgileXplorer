import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Mission } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { MissionLogsDialogComponent } from '../mission-logs-dialog/mission-logs-dialog.component';

@Component({
    selector: 'app-mission-history',
    templateUrl: './mission-history.component.html',
    styleUrls: ['./mission-history.component.css']
})
export class MissionHistoryComponent implements OnInit, OnDestroy {
    displayedColumns: string[] = ['id', 'startTime', 'endTime'];
    missions: Mission[] = [];
    private destroy$ = new Subject<void>();

    constructor(
        private missionService: MissionService,
        private dialog: MatDialog
    ) {}

    ngOnInit() {
        this.loadMissions();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadMissions() {
        this.missionService.loadMissionHistory()
            .pipe(takeUntil(this.destroy$))
            .subscribe(missions => {
                this.missions = missions;
            });
    }

    showMissionLogs(mission: Mission) {
        this.missionService.downloadLogs(mission.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(logs => {
                this.dialog.open(MissionLogsDialogComponent, {
                    data: {
                        missionId: mission.id,
                        logs: logs
                    },
                    width: '600px',
                    maxHeight: '80vh'
                });
            });
    }
}