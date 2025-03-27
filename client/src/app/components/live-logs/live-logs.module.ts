import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { LiveLogsComponent } from './live-logs.component';

@NgModule({
  declarations: [
    LiveLogsComponent
  ],
  imports: [
    CommonModule,
    MatCardModule
  ],
  exports: [
    LiveLogsComponent
  ]
})
export class LiveLogsModule { }