import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil, mergeMap, map } from 'rxjs';
import { Mission } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { MissionLogsDialogComponent } from '../mission-logs-dialog/mission-logs-dialog.component';

@Component({
    selector: 'app-mission-history',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatCardModule,
        MatTooltipModule
    ],
    templateUrl: './mission-history.component.html',
    styleUrl: './mission-history.component.css'
})
export class MissionHistoryComponent implements OnInit, OnDestroy {
    displayedColumns: string[] = ['id', 'startTime', 'endTime', 'robots', 'totalDistance'];
    dataSource: MatTableDataSource<Mission> = new MatTableDataSource<Mission>([]);
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;
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
                this.dataSource = new MatTableDataSource(missions);
                this.dataSource.sort = this.sort;
                this.dataSource.paginator = this.paginator;
            });
    }

    showMissionLogs(mission: Mission) {
        this.missionService.downloadLogs(mission.id).pipe(
            mergeMap(logs => 
                this.missionService.getMissionMap(mission.id).pipe(
                    map(mapData => ({ logs, mapData }))
                )
            ),
            takeUntil(this.destroy$)
        ).subscribe(({ logs, mapData }) => {
            this.dialog.open(MissionLogsDialogComponent, {
                data: {
                    missionId: mission.id,
                    logs: logs,
                    mapImage: mapData.data
                },
                width: '1600px',
                maxHeight: '90vh'
            });
        });
    }
}