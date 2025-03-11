import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RobotService } from '../../services/robot.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { RobotState } from '../../interfaces/robot-state.interface';
import { MissionHistoryComponent } from '../mission-history/mission-history.component';
import { MapComponent } from '../map/map.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatCardModule,
        MatDialogModule,
        MissionHistoryComponent
        MapComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
    robotStates: { [key: string]: RobotState } = {
        'limo1': { isMissionActive: false, isIdentified: false },
        'limo2': { isMissionActive: false, isIdentified: false }
    };

    constructor(
        private robotService: RobotService,
        private notificationService: NotificationService,
        private dialog: MatDialog,
    ) {}

    startMission(robotId: string): void {
        this.robotService.startMission(robotId).subscribe(() => {
            this.robotStates[robotId].isMissionActive = true;
            this.notificationService.missionStarted();
        });
    }

    stopMission(robotId: string): void {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '400px',
            data: { message: `Êtes-vous sûr de vouloir arrêter la mission en cours pour le robot ${robotId} ?` }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.robotService.stopMission(robotId).subscribe(() => {
                    this.robotStates[robotId].isMissionActive = false;
                    this.robotStates[robotId].isIdentified = false;
                    this.notificationService.missionEnded();
                });
            }
        });
    }

    identify(robotId: string): void {
        this.robotService.identify(robotId).subscribe(() => {
            this.robotStates[robotId].isIdentified = true;
            this.notificationService.identifySignal();
        });
    }
}
