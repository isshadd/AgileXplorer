import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RobotService } from '../../services/robot.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { RobotState } from '../../interfaces/robot-state.interface';
import { MapComponent } from '../map/map.component';
import { WebSocketService } from '../../services/websocket.service';
import { ConnectedClientsComponent } from '../connected-clients/connected-clients.component';
import { WebSocketService } from '../../services/websocket.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatCardModule,
        MatDialogModule,
        MatProgressBarModule,
        MatIconModule,
        MatTooltipModule,
        MapComponent,
        MatIconModule,
        ConnectedClientsComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
    robotStates: { [key: string]: RobotState } = {
        'robot1_102': { isMissionActive: false, isIdentified: false, battery_level: 0 },
        'robot2_102': { isMissionActive: false, isIdentified: false, battery_level: 0 }
      };

    constructor(
        private robotService: RobotService,
        private notificationService: NotificationService,
        private dialog: MatDialog,
    ) {}

    get isController(): boolean {
        return this.websocketService.isControllerClient();
    }

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
