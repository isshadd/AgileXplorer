import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { RobotService } from '../../services/robot.service';
import { NotificationService } from '../../services/notification.service';
import { Robot, WheelMode } from '../../models/robot.model';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatOptionModule
  ]
})
export class ConfigurationComponent implements OnInit, OnDestroy {
  robots: Robot[] = [];
  private robotsSubscription!: Subscription;

  wheelModes: { value: WheelMode; label: string }[] = [
    { value: 'ackerman', label: 'Ackerman' },
    { value: 'differential', label: 'Différentiel' }
  ];

  constructor(
    private robotService: RobotService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.robotsSubscription = this.robotService.getRobots()
      .subscribe(robotStates => {
        this.robots = robotStates.map(state => ({
          id: state.id,
          name: state.name,
          state: state
        }));
      });
  }

  ngOnDestroy(): void {
    if (this.robotsSubscription) {
      this.robotsSubscription.unsubscribe();
    }
  }

  onWheelModeChange(robotId: string, mode: WheelMode): void {
    this.robotService.setWheelMode(robotId, mode);
    this.notificationService.wheelModeChanged(`Robot ${robotId}`, mode);
  }

  getCurrentWheelMode(robot: Robot): WheelMode {
    return robot.state.wheelMode.type;
  }

  getWheelModeLabel(mode: WheelMode): string {
    return this.wheelModes.find(wm => wm.value === mode)?.label || mode;
  }
}