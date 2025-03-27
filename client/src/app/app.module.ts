import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';

// Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

// Components and Modules
import { AppComponent } from './app.component';
import { DashboardModule } from './components/dashboard/dashboard.module';
import { SharedModule } from './components/shared/shared.module';

// Services
import { WebSocketService } from './services/websocket.service';
import { RobotService } from './services/robot.service';
import { NotificationService } from './services/notification.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    DashboardModule,
    SharedModule
  ],
  providers: [
    WebSocketService,
    RobotService,
    NotificationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }