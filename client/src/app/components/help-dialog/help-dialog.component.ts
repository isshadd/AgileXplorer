import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-help-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatExpansionModule
  ],
  templateUrl: './help-dialog.component.html',
  styleUrl: './help-dialog.component.css'
})
export class HelpDialogComponent {
  constructor(public dialogRef: MatDialogRef<HelpDialogComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}