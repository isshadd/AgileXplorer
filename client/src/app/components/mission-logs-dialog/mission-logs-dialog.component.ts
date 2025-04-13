import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-mission-logs-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Logs de la Mission {{data.missionId}}</mat-card-title>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </mat-card-header>
      <mat-card-content class="dialog-content">
        <div class="logs-section">
          <h3>Historique des logs</h3>
          <mat-list>
            <mat-list-item *ngFor="let log of data.logs">
              <span class="timestamp">{{log.type}}</span>
              <span class="timestamp">{{log.robotId}}</span>
              <span class="timestamp">{{log.timestamp | date:'HH:mm:ss'}}</span>
              <span *ngIf="log.type === 'SENSOR'" class="message">Distance: {{log.data.distance | number:'1.2-2'}}m </span>
              <span *ngIf="log.type === 'SENSOR'" class="message">Position x:{{log.data.position.x | number:'1.2-2'}}, y:{{log.data.position.y | number:'1.2-2'}}, z:{{log.data.position.z | number:'1.2-2'}}</span>
              <span *ngIf="log.type === 'SENSOR' && log.data.totalDistance" class="message">Distance totale: {{log.data.totalDistance | number:'1.2-2'}}m</span>
              <span *ngIf="log.type === 'COMMAND'" class="message">Commande: {{log.data.command}}</span>
            </mat-list-item>
          </mat-list>
        </div>
        <div class="map-section">
          <h3>Carte de la mission</h3>
          <div class="map-container">
            <img *ngIf="data.mapImage" [src]="data.mapImage" alt="Mission Map" class="mission-map">
            <div *ngIf="!data.mapImage" class="no-map">
              Aucune carte disponible pour cette mission
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card {
      max-height: 90vh;
      width: 100%;
      min-width: 1400px;
    }
    mat-card-header {
      display: flex;
      justify-content: space-between;
      padding: 16px;
      align-items: center;
      margin-bottom: 16px;
    }
    .dialog-content {
      display: flex;
      gap: 24px;
      max-height: calc(90vh - 120px);
      padding: 0 16px 16px 16px;
    }
    .logs-section {
      flex: 3;
      overflow-y: auto;
      padding-right: 24px;
      border-right: 1px solid #ddd;
      width: 50%;
    }
    .map-section {
      flex: 2;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .map-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    .mission-map {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .no-map {
      color: #666;
      text-align: center;
      padding: 20px;
    }
    .timestamp {
      margin-right: 16px;
      color: #666;
    }
    .message {
      flex: 1;
      white-space: normal;
      word-wrap: break-word;
    }
    h3 {
      margin-top: 0;
      margin-bottom: 16px;
      color: #333;
    }
  `]
})
export class MissionLogsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { missionId: string; logs: any[]; mapImage?: string },
    private dialogRef: MatDialogRef<MissionLogsDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}