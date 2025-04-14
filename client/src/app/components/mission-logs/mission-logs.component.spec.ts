import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MissionLogsComponent } from './mission-logs.component';
import { WebSocketService } from '../../services/websocket.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MissionLog } from '../../interfaces/mission-log.interface';

describe('MissionLogsComponent', () => {
  let component: MissionLogsComponent;
  let fixture: ComponentFixture<MissionLogsComponent>;
  let websocketServiceMock: jasmine.SpyObj<WebSocketService>;

  // Créer des données de test pour les logs
  const mockLogs: MissionLog[] = [
    {
      robotId: 'limo1',
      type: 'COMMAND',
      data: {
        command: 'START_MISSION',
        timestamp: '2025-04-14T14:00:00.000Z'
      }
    },
    {
      robotId: 'limo2',
      type: 'SENSOR',
      data: {
        distance: 0.5,
        timestamp: '2025-04-14T14:01:00.000Z'
      }
    },
    {
      robotId: 'limo1',
      type: 'SENSOR',
      data: {
        position: { x: 1.2, y: 3.4, z: 0 },
        timestamp: '2025-04-14T14:02:00.000Z'
      }
    }
  ];

  beforeEach(async () => {
    // Créer un mock pour WebSocketService
    websocketServiceMock = jasmine.createSpyObj('WebSocketService', ['onMissionLogs']);
    
    // Configurer le retour de la méthode mockée
    websocketServiceMock.onMissionLogs.and.returnValue(of(mockLogs));
    
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        { provide: WebSocketService, useValue: websocketServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MissionLogsComponent);
    component = fixture.componentInstance;
    
    // Espionner la méthode privée scrollToBottom
    spyOn<any>(component, 'scrollToBottom');
    
    fixture.detectChanges(); // Déclenche ngOnInit
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });
  
  it('devrait s\'abonner aux logs de mission à l\'initialisation', () => {
    expect(websocketServiceMock.onMissionLogs).toHaveBeenCalled();
    expect(component.currentLogs).toEqual(mockLogs);
    expect(component['scrollToBottom']).toHaveBeenCalled();
  });
  
  it('devrait formater correctement l\'horodatage', () => {
    const timestamp = '2025-04-14T14:00:00.000Z';
    const expectedTime = new Date(timestamp).toLocaleTimeString();
    
    expect(component.formatTime(timestamp)).toBe(expectedTime);
  });
  
  it('devrait générer le message correct pour les commandes', () => {
    const startMissionLog = mockLogs[0];
    expect(component.getLogMessage(startMissionLog)).toBe('Mission démarrée');
    
    const stopMissionLog: MissionLog = {
      robotId: 'limo1',
      type: 'COMMAND',
      data: {
        command: 'STOP_MISSION',
        timestamp: '2025-04-14T14:00:00.000Z'
      }
    };
    expect(component.getLogMessage(stopMissionLog)).toBe('Mission arrêtée');
    
    const returnToBaseLog: MissionLog = {
      robotId: 'limo1',
      type: 'COMMAND',
      data: {
        command: 'RETURN_TO_BASE',
        timestamp: '2025-04-14T14:00:00.000Z'
      }
    };
    expect(component.getLogMessage(returnToBaseLog)).toBe('Retour à la base');
    
    const customCommandLog: MissionLog = {
      robotId: 'limo1',
      type: 'COMMAND',
      data: {
        command: 'CUSTOM_COMMAND',
        timestamp: '2025-04-14T14:00:00.000Z'
      }
    };
    expect(component.getLogMessage(customCommandLog)).toBe('CUSTOM_COMMAND');
  });
  
  it('devrait générer le message correct pour les données de capteur', () => {
    const distanceLog = mockLogs[1];
    expect(component.getLogMessage(distanceLog)).toContain('Distance: 0.5');
    
    const positionLog = mockLogs[2];
    expect(component.getLogMessage(positionLog)).toBe(' Position: x:1.2, y:3.4, z:0');
  });
  
  it('devrait se désabonner lors de la destruction', () => {
    // Espionner la méthode unsubscribe
    const subscription = component['logSubscription'];
    spyOn(subscription!, 'unsubscribe');
    
    // Déclencher la destruction du composant
    component.ngOnDestroy();
    
    // Vérifier que unsubscribe a été appelé
    expect(subscription!.unsubscribe).toHaveBeenCalled();
  });
  
  it('devrait faire défiler la vue vers le bas', fakeAsync(() => {
    // Remplacer l'espionnage pour tester la vraie méthode
    (component as any).scrollToBottom.and.callThrough();
    
    // Créer un élément mock pour le conteneur de logs
    const mockContainer = {
      scrollTop: 0,
      scrollHeight: 1000
    };
    
    // Espionner document.querySelector et renvoyer notre mock
    spyOn(document, 'querySelector').and.returnValue(mockContainer as any);
    
    // Appeler la méthode
    (component as any).scrollToBottom();
    
    // Avancer le temps pour laisser le setTimeout s'exécuter
    tick(100);
    
    // Vérifier que le défilement a été mis à jour
    expect(mockContainer.scrollTop).toBe(mockContainer.scrollHeight);
  }));
});