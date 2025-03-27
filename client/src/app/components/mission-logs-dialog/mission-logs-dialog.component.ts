import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Log } from '../../interfaces/log.interface';

interface DialogData {
  missionId: string;
  logs: Log[];
}

@Component({
  selector: 'app-mission-logs-dialog',
  templateUrl: './mission-logs-dialog.component.html',
  styleUrls: ['./mission-logs-dialog.component.css']
})
export class MissionLogsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dialogRef: MatDialogRef<MissionLogsDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}