import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RobotService } from '../../services/robot.service';
import { MissionService } from '../../services/mission.service';
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
    @ViewChild(MapComponent) mapComponent!: MapComponent;
    robots: string[] = [];
    private subscription: Subscription = new Subscription();
    showHistory = false;
    robotStates: { [key: string]: RobotState } = {
        'limo1': { isMissionActive: false, isIdentified: false, isP2PActive: false },
        'limo2': { isMissionActive: false, isIdentified: false, isP2PActive: false }
    };
    private autoReturnTriggered = new Set<string>();

    anyRobotInMission(): boolean {
        return Object.values(this.robotStates).some(state => state.isMissionActive);
    }

    allRobotsIdentified(): boolean {
        return Object.values(this.robotStates).every(state => state.isIdentified);
    }

    toggleView(): void {
        this.showHistory = !this.showHistory;
    }

    private checkBatteryAndAutoReturn(robotId: string, batteryLevel: number): void {
        const robotState = this.robotStates[robotId];
        
        if (!robotState || batteryLevel === undefined) return;

        if (batteryLevel > 30) {
            this.autoReturnTriggered.delete(robotId);
            return;
        }

        if (robotState.isMissionActive &&
            batteryLevel >= 1 &&
            batteryLevel <= 30 &&
            !this.autoReturnTriggered.has(robotId)) {
            
            this.notificationService.warning(`Robot ${robotId}: Niveau de batterie bas (${batteryLevel}%). Retour automatique à la base.`);
            this.returnToBase(robotId, true);
            this.autoReturnTriggered.add(robotId);
        }
    }

    constructor(
        private robotService: RobotService,
        private missionService: MissionService,
        private notificationService: NotificationService,
        private dialog: MatDialog,
        private websocketService: WebSocketService,
    ) {
        this.websocketService.onBatteryData().subscribe((data: { robotId: string, battery_level: number }) => {
            if (this.robotStates[data.robotId]) {
                this.robotStates[data.robotId].battery_level = data.battery_level;
                this.checkBatteryAndAutoReturn(data.robotId, data.battery_level);
            }
        });
        this.websocketService.onRobotState().subscribe((data: { robotId: string, state: string }) => {
            if (this.robotStates[data.robotId]) {
                this.robotStates[data.robotId].isMissionActive = data.state === 'en mission';
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
                // Capture the map image before stopping the mission
                const mapImage = this.mapComponent.captureMapState();
                
                this.robotService.stopMission(robotId).subscribe(({ stoppedMissionId }) => {
                    // Save the map image
                    if (stoppedMissionId) {
                        const mapData = {
                            timestamp: new Date().toISOString(),
                            data: mapImage
                        };
                        this.missionService.saveMap(stoppedMissionId, mapData).subscribe(() => {
                            console.log('Mission map saved successfully');
                        });
                    }
                    
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

    returnToBase(robotId: string, skipConfirmation: boolean = false): void {
        const executeReturn = () => {
            this.robotService.returnToBase(robotId).subscribe(() => {
                this.notificationService.returnToBase();
            });
        };

        if (skipConfirmation) {
            executeReturn();
        } else {
            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                width: '400px',
                data: { message: `Êtes-vous sûr de vouloir faire retourner le robot ${robotId} à sa base ?` }
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result) {
                    executeReturn();
                }
            });
        }
    }

    isAnyOtherRobotP2PActive(currentRobotId: string): boolean {
        return Object.entries(this.robotStates)
            .filter(([id, _]) => id !== currentRobotId)
            .some(([_, state]) => state.isP2PActive);
    }

    getP2PButtonTooltip(robotId: string): string {
        if (!this.isController) {
            return 'Mode spectateur actif';
        }
        if (this.isAnyOtherRobotP2PActive(robotId)) {
            return 'Un autre robot est déjà en mode P2P';
        }
        return '';
    }

    toggleP2P(robotId: string): void {
        const newP2PState = !this.robotStates[robotId].isP2PActive;

        // Vérifier si un autre robot est en P2P
        if (newP2PState && this.isAnyOtherRobotP2PActive(robotId)) {
            this.notificationService.p2pStateChanged(
                `Impossible d'activer le mode P2P : un autre robot est déjà en mode P2P`
            );
            return;
        }

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '400px',
            data: { message: `Voulez-vous ${newP2PState ? 'activer' : 'désactiver'} le mode P2P pour le robot ${robotId} ?` }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.robotService.toggleP2P(robotId, newP2PState).subscribe(() => {
                    this.robotStates[robotId].isP2PActive = newP2PState;
                    this.notificationService.p2pStateChanged(
                        `Mode P2P ${newP2PState ? 'activé' : 'désactivé'} pour le robot ${robotId}`
                    );
                });
            }
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
