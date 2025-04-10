import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RobotService } from '../../services/robot.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { HelpDialogComponent } from '../help-dialog/help-dialog.component';
import { RobotState } from '../../interfaces/robot-state.interface';
import { MissionHistoryComponent } from '../mission-history/mission-history.component';
import { MapComponent } from '../map/map.component';
import { ConnectedClientsComponent } from '../connected-clients/connected-clients.component';
import { MissionLogsComponent } from '../mission-logs/mission-logs.component';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

interface RobotPosition {
    x: number;
    y: number;
    timestamp?: number;
}
  

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
        MissionHistoryComponent,
        ConnectedClientsComponent,
        MapComponent,
        MissionLogsComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
    robots: string[] = [];
    private subscription: Subscription = new Subscription();
    showHistory = false;
    robotStates: { [key: string]: RobotState } = {
        'limo1': { isMissionActive: false, isIdentified: false },
        'limo2': { isMissionActive: false, isIdentified: false }
    };

    anyRobotInMission(): boolean {
        return Object.values(this.robotStates).some(state => state.isMissionActive);
    }

    allRobotsIdentified(): boolean {
        return Object.values(this.robotStates).every(state => state.isIdentified);
    }

    toggleView(): void {
        this.showHistory = !this.showHistory;
    }

    constructor(
        private robotService: RobotService,
        private notificationService: NotificationService,
        private dialog: MatDialog,
        private websocketService: WebSocketService,
    ) {
        this.websocketService.onBatteryData().subscribe((data: { robotId: string, battery_level: number }) => {
            if (this.robotStates[data.robotId]) {
              this.robotStates[data.robotId].battery_level = data.battery_level;
            }
          });
    }

    ngOnInit(): void {
        this.subscription.add(
            this.websocketService.onRobotPosition().subscribe((data: { robotId: string; position: RobotPosition }) => {
              if (data.robotId && data.position && typeof data.position.x === 'number' && typeof data.position.y === 'number') {
                if (!this.robots.includes(data.robotId)) this.robots.push(data.robotId);
              }
            })
          );
    }

    get isController(): boolean {
        return this.websocketService.isControllerClient();
    }

    startMission(robotId: string): void {
        this.robotService.startMission(robotId).subscribe(({ missionId }) => {
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
                this.robotService.stopMission(robotId).subscribe(({ stoppedMissionId }) => {
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
    
    openHelpDialog(): void {
        this.dialog.open(HelpDialogComponent, {
            width: '800px',
            maxWidth: '90vw',
            maxHeight: '80vh'
        });
    }

    returnToBase(robotId: string): void {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '400px',
            data: { message: `Êtes-vous sûr de vouloir faire retourner le robot ${robotId} à sa base ?` }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.robotService.returnToBase(robotId).subscribe(() => {
                    this.notificationService.returnToBase();
                });
            }
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
