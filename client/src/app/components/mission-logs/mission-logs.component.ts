import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { MissionLog } from '../../interfaces/mission-log.interface';

@Component({
  selector: 'app-mission-logs',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card class="mission-logs">
      <mat-card-header>
        <mat-card-title>Mission en cours</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="logs-container">
          <div *ngFor="let log of currentLogs" class="log-entry">
            <span class="timestamp">{{ formatTime(log.data.timestamp) }}</span>
            <span class="robot-id">{{ log.robotId }}</span>
            <span class="message" style="color:White;">
              {{ getLogMessage(log) }}
            </span>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .mission-logs {
      height: 300px;
      margin: 16px;
    }

    .logs-container {
      height: 220px;
      overflow-y: auto;
      padding: 8px;
    }

    .log-entry {
      margin-bottom: 8px;
      padding: 4px;
      border-bottom: 1px solid #eee;
    }

    .timestamp {
      color: #666;
      margin-right: 8px;
      font-size: 0.9em;
    }

    .robot-id {
      color: #1976d2;
      margin-right: 8px;
      font-weight: bold;
    }

    .message {
      color: #333;
    }
  `]
})
export class MissionLogsComponent implements OnInit, OnDestroy {
  currentLogs: MissionLog[] = [];
  private logSubscription: Subscription | undefined;

  constructor(private websocketService: WebSocketService) {}

  ngOnInit() {
    this.logSubscription = this.websocketService.onMissionLogs().subscribe((logs: MissionLog[]) => {
      this.currentLogs = logs;
      this.scrollToBottom();
    });
  }

  ngOnDestroy() {
    if (this.logSubscription) {
      this.logSubscription.unsubscribe();
    }
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  getLogMessage(log: any): string {
    if (log.type === 'COMMAND') {
      switch (log.data.command) {
        case 'START_MISSION':
          return 'Mission démarrée';
        case 'STOP_MISSION':
          return 'Mission arrêtée';
        case 'RETURN_TO_BASE':
          return 'Retour à la base';
        default:
          return log.data.command;
      }
    } else if (log.type === 'SENSOR') {
      let logMessage = '';
      logMessage += log.data.message ? `${log.data.message}` : '';
      logMessage += log.data.distance ? `Distance: ${log.data.distance}` : '';
      logMessage += log.data.position ?
        ` Position: x:${log.data.position.x.toFixed(2)}, y:${log.data.position.y.toFixed(2)}, z:${log.data.position.z.toFixed(2)}` : '';
      return logMessage;
    }
    return '';
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.logs-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}