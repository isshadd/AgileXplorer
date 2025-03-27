import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { DashboardComponent } from './dashboard.component';
import { LiveLogsModule } from '../live-logs/live-logs.module';
import { MissionHistoryModule } from '../mission-history/mission-history.module';

@NgModule({
  declarations: [
    DashboardComponent
  ],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    LiveLogsModule,
    MissionHistoryModule
  ],
  exports: [
    DashboardComponent
  ]
})
export class DashboardModule { }