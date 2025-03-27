import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RobotService } from '../../services/robot.service';
import { WebSocketService } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { RobotState } from '../../interfaces/robot-state.interface';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
    robotStates: { [key: string]: RobotState } = {
        'limo1': { isMissionActive: false, isIdentified: false },
        'limo2': { isMissionActive: false, isIdentified: false }
    };

    private stateSubscription?: Subscription;

    constructor(
        private robotService: RobotService,
        private webSocketService: WebSocketService,
        private notificationService: NotificationService,
        private dialog: MatDialog,
    ) {}

    ngOnInit() {
        this.stateSubscription = this.webSocketService.getRobotStates()
            .subscribe(states => {
                this.robotStates = states;
            });
    }

    ngOnDestroy() {
        if (this.stateSubscription) {
            this.stateSubscription.unsubscribe();
        }
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
