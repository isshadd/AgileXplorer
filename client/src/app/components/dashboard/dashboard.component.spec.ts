import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { RobotService } from '../../services/robot.service';
import { NotificationService } from '../../services/notification.service';
import { WebSocketService } from '../../services/websocket.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let robotServiceMock: jasmine.SpyObj<RobotService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let dialogMock: jasmine.SpyObj<MatDialog>;
  let websocketServiceMock: jasmine.SpyObj<WebSocketService>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<ConfirmationDialogComponent>>;

  beforeEach(async () => {
    // Créer les mocks
    robotServiceMock = jasmine.createSpyObj('RobotService', [
      'startMission',
      'stopMission',
      'identify',
      'returnToBase',
      'toggleP2P'
    ]);
    
    notificationServiceMock = jasmine.createSpyObj('NotificationService', [
      'missionStarted',
      'missionEnded',
      'identifySignal',
      'returnToBase',
      'p2pStateChanged',
      'warning'
    ]);
    
    dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefMock.afterClosed.and.returnValue(of(true)); // Simuler une confirmation
    
    dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    dialogMock.open.and.returnValue(dialogRefMock);
    
    websocketServiceMock = jasmine.createSpyObj('WebSocketService', [
      'onBatteryData',
      'onRobotState',
      'onRobotPosition',
      'isControllerClient'
    ]);
    
    // Configurer les retours des méthodes mockées
    robotServiceMock.startMission.and.returnValue(of({ missionId: 'mission-123' }));
    robotServiceMock.stopMission.and.returnValue(of({ stoppedMissionId: 'mission-123' }));
    robotServiceMock.identify.and.returnValue(of(undefined)); // Correct pour Observable<void>
    robotServiceMock.returnToBase.and.returnValue(of(undefined)); // Correct pour Observable<void>
    robotServiceMock.toggleP2P.and.returnValue(of({ message: 'P2P state toggled successfully' }));
    
    websocketServiceMock.onBatteryData.and.returnValue(of({ robotId: 'limo1', battery_level: 80 }));
    websocketServiceMock.onRobotState.and.returnValue(of({ robotId: 'limo1', state: 'en attente' }));
    websocketServiceMock.onRobotPosition.and.returnValue(of({ 
      robotId: 'limo1', 
      position: { x: 1.2, y: 3.4 } 
    }));
    websocketServiceMock.isControllerClient.and.returnValue(true);
    
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA], // Pour ignorer les éléments personnalisés dans le template
      providers: [
        { provide: RobotService, useValue: robotServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: WebSocketService, useValue: websocketServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });
  
  it('devrait initialiser les états des robots', () => {
    expect(component.robotStates).toBeDefined();
    expect(component.robotStates['limo1']).toBeDefined();
    expect(component.robotStates['limo2']).toBeDefined();
    expect(component.robotStates['limo1'].isMissionActive).toBeFalse();
    expect(component.robotStates['limo1'].isIdentified).toBeFalse();
  });
  
  it('devrait s\'abonner aux données WebSocket lors de l\'initialisation', () => {
    expect(websocketServiceMock.onBatteryData).toHaveBeenCalled();
    expect(websocketServiceMock.onRobotState).toHaveBeenCalled();
    expect(websocketServiceMock.onRobotPosition).toHaveBeenCalled();
  });
  
  it('devrait démarrer une mission', () => {
    component.startMission('limo1');
    
    expect(robotServiceMock.startMission).toHaveBeenCalledWith('limo1');
    expect(component.robotStates['limo1'].isMissionActive).toBeTrue();
    expect(notificationServiceMock.missionStarted).toHaveBeenCalled();
  });
  
  it('devrait arrêter une mission après confirmation', () => {
    component.stopMission('limo1');
    
    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationDialogComponent,
      jasmine.objectContaining({
        width: '400px',
        data: jasmine.objectContaining({
          message: jasmine.stringContaining('limo1')
        })
      })
    );
    
    expect(robotServiceMock.stopMission).toHaveBeenCalledWith('limo1');
    expect(component.robotStates['limo1'].isMissionActive).toBeFalse();
    expect(notificationServiceMock.missionEnded).toHaveBeenCalled();
  });
  
  it('devrait identifier un robot', () => {
    component.identify('limo1');
    
    expect(robotServiceMock.identify).toHaveBeenCalledWith('limo1');
    expect(component.robotStates['limo1'].isIdentified).toBeTrue();
    expect(notificationServiceMock.identifySignal).toHaveBeenCalled();
  });
  
  it('devrait déclencher un retour à la base sans confirmation si spécifié', () => {
    component.returnToBase('limo1', true);
    
    // Ne devrait pas ouvrir la boîte de dialogue de confirmation
    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(robotServiceMock.returnToBase).toHaveBeenCalledWith('limo1');
    expect(notificationServiceMock.returnToBase).toHaveBeenCalled();
  });
  
  it('devrait basculer la vue', () => {
    // État initial
    expect(component.showHistory).toBeFalse();
    
    // Basculer la vue
    component.toggleView();
    
    // La vue devrait être basculée
    expect(component.showHistory).toBeTrue();
    
    // Basculer à nouveau
    component.toggleView();
    
    // Devrait revenir à l'état initial
    expect(component.showHistory).toBeFalse();
  });
  
  it('devrait vérifier si un robot est en mission', () => {
    // Au départ, aucun robot n'est en mission
    expect(component.anyRobotInMission()).toBeFalse();
    
    // Mettre un robot en mission
    component.robotStates['limo1'].isMissionActive = true;
    
    // Maintenant, au moins un robot est en mission
    expect(component.anyRobotInMission()).toBeTrue();
  });
  
  it('devrait se désabonner lors de la destruction', () => {
    // Espionner la méthode unsubscribe du subscription
    spyOn(component['subscription'], 'unsubscribe');
    
    // Déclencher la destruction du composant
    component.ngOnDestroy();
    
    // Vérifier que unsubscribe a été appelé
    expect(component['subscription'].unsubscribe).toHaveBeenCalled();
  });
});
