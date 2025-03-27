import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';

import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { MissionLogsDialogComponent } from '../mission-logs-dialog/mission-logs-dialog.component';

@NgModule({
  declarations: [
    ConfirmationDialogComponent,
    MissionLogsDialogComponent
  ],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule
  ],
  exports: [
    ConfirmationDialogComponent,
    MissionLogsDialogComponent
  ]
})
export class SharedModule { }