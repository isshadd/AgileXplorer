import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
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
export class MissionHistoryComponent implements OnInit, OnDestroy, AfterViewInit {
    displayedColumns: string[] = ['id', 'startTime', 'endTime', 'status', 'totalDistance', 'duration'];
    missions: Mission[] = [];
    private destroy$ = new Subject<void>();

    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    dataSource = new MatTableDataSource<Mission>([]);

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
                this.dataSource.data = missions;
                this.dataSource.sort = this.sort;
                this.dataSource.paginator = this.paginator;
            });
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
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