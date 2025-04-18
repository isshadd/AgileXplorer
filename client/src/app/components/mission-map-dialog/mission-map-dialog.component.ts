import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-mission-map-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <div class="map-dialog">
      <h2 mat-dialog-title>Mission Map</h2>
      <mat-dialog-content>
        <img [src]="data.mapData" alt="Mission Map" style="width: 100%; height: auto;">
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .map-dialog {
      padding: 20px;
    }
    mat-dialog-content {
      max-height: 80vh;
      overflow: auto;
    }
  `]
})
export class MissionMapDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MissionMapDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mapData: string }
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}