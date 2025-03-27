import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { Log } from '../../interfaces/log.interface';

@Component({
  selector: 'app-live-logs',
  templateUrl: './live-logs.component.html',
  styleUrls: ['./live-logs.component.css']
})
export class LiveLogsComponent implements OnInit, OnDestroy {
  logs: Log[] = [];
  private readonly MAX_LOGS = 100;
  private subscriptions: Subscription[] = [];

  constructor(private webSocketService: WebSocketService) {}

  ngOnInit() {
    this.subscriptions.push(
      this.webSocketService.getMissionLogs().subscribe((log: Log) => {
        this.logs.unshift(log); // Add new logs at the beginning
        if (this.logs.length > this.MAX_LOGS) {
          this.logs.pop(); // Remove oldest log if we exceed max capacity
        }
      })
    );
  }

  ngOnDestroy() {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => {
      if (sub) {
        sub.unsubscribe();
      }
    });
    this.logs = []; // Clear logs
  }

  getLogIcon(type: string): string {
    return type === 'SENSOR' ? '📡' : '⚡';
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString();
  }
}