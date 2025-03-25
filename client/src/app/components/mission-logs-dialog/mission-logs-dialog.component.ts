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
      <mat-card-content>
        <mat-list>
          <mat-list-item *ngFor="let log of data.logs">
            <span class="timestamp">{{log.type}}</span>
            <span class="timestamp">{{log.robotId}}</span>
            <span class="timestamp">{{log.timestamp | date:'HH:mm:ss'}}</span>
            <span *ngIf="log.type === 'SENSOR'" class="message">Distance: {{log.data.distance}} </span>
            <span *ngIf="log.type === 'SENSOR'" class="message">Position x:{{log.data.position.x}}, y:{{log.data.position.y}}, z:{{log.data.position.z}}</span>
            <span *ngIf="log.type === 'COMMAND'" class="message">Commande: {{log.data.command}}</span>            
          </mat-list-item>
        </mat-list>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card {
      max-height: 80vh;
      width: 600px;
    }
    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    mat-card-content {
      max-height: calc(80vh - 100px);
      overflow-y: auto;
    }
    .timestamp {
      margin-right: 16px;
      color: #666;
    }
    .message {
      flex: 1;
    }
  `]
})
export class MissionLogsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { missionId: string; logs: any[] },
    private dialogRef: MatDialogRef<MissionLogsDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}