import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { WebSocketService } from '../../services/websocket.service';
import { of } from 'rxjs';
import { ElementRef } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let websocketServiceMock: jasmine.SpyObj<WebSocketService>;

  beforeEach(async () => {
    // Créer un mock pour WebSocketService
    websocketServiceMock = jasmine.createSpyObj('WebSocketService', [
      'onRobotPosition',
      'onMapData',
      'isControllerClient',
      'emit'
    ]);
    
    // Configurer les retours de méthodes mockées
    websocketServiceMock.onRobotPosition.and.returnValue(of({ 
      robotId: 'robot1', 
      position: { x: 1.5, y: 2.5 } 
    }));
    
    websocketServiceMock.onMapData.and.returnValue(of({
      resolution: 0.05,
      width: 100,
      height: 100,
      origin: { 
        x: 0, y: 0, z: 0,
        orientation: { x: 0, y: 0, z: 0, w: 1 }
      },
      data: new Array(10000).fill(0) // 100x100 cellules initialisées à 0
    }));
    
    websocketServiceMock.isControllerClient.and.returnValue(true);
    
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        { provide: WebSocketService, useValue: websocketServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    
    // Mock du contexte Canvas car il n'est pas disponible en environnement de test
    const mockContext = {
      clearRect: jasmine.createSpy('clearRect'),
      beginPath: jasmine.createSpy('beginPath'),
      stroke: jasmine.createSpy('stroke'),
      fill: jasmine.createSpy('fill'),
      arc: jasmine.createSpy('arc'),
      moveTo: jasmine.createSpy('moveTo'),
      lineTo: jasmine.createSpy('lineTo'),
      fillText: jasmine.createSpy('fillText'),
      save: jasmine.createSpy('save'),
      restore: jasmine.createSpy('restore'),
      translate: jasmine.createSpy('translate'),
      scale: jasmine.createSpy('scale'),
      drawImage: jasmine.createSpy('drawImage')
    };
    
    // Remplacer le HTML5 Canvas context par notre mock
    const canvasElement = document.createElement('canvas');
    spyOn(canvasElement, 'getContext').and.returnValue(mockContext as any);
    component.canvasRef = { nativeElement: canvasElement } as ElementRef<HTMLCanvasElement>;
    
    // Mock pour les méthodes qui utilisent le canvas directement
    spyOn<any>(component, 'startDrawLoop').and.callFake(() => {});
    spyOn<any>(component, 'drawMap').and.callFake(() => {});
    
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });
  
  it('devrait s\'abonner aux positions de robot et données de carte à l\'initialisation', () => {
    expect(websocketServiceMock.onRobotPosition).toHaveBeenCalled();
    expect(websocketServiceMock.onMapData).toHaveBeenCalled();
  });
  
  it('devrait basculer le mode d\'affichage', () => {
    // Vérifier l'état initial
    expect(component.displayMode).toBe('background');
    
    // Basculer le mode
    component.toggleDisplayMode();
    
    // Vérifier le changement
    expect(component.displayMode).toBe('mapping');
    
    // Basculer à nouveau
    component.toggleDisplayMode();
    
    // Vérifier le retour à l'état initial
    expect(component.displayMode).toBe('background');
  });
  
  it('devrait ajuster le zoom', () => {
    // Sauvegarder la valeur initiale de l'échelle
    const initialScale = (component as any).scale;
    
    // Tester le zoom avant
    component.zoomIn();
    expect((component as any).scale).toBeGreaterThan(initialScale);
    
    // Remettre à la valeur initiale
    (component as any).scale = initialScale;
    
    // Tester le zoom arrière
    component.zoomOut();
    expect((component as any).scale).toBeLessThan(initialScale);
  });
  
  it('devrait réinitialiser la vue aux valeurs par défaut', () => {
    // Modifier l'échelle et le centre
    (component as any).scale = 100;
    (component as any).centerX = 1000;
    (component as any).centerY = 1000;
    
    // Réinitialiser la vue
    component.resetView();
    
    // Vérifier les valeurs par défaut
    expect((component as any).scale).toBe(50);
  });
  
  it('devrait se désabonner lors de la destruction', () => {
    // Espionner la méthode unsubscribe du subscription
    spyOn((component as any).subscription, 'unsubscribe');
    
    // Déclencher la destruction du composant
    component.ngOnDestroy();
    
    // Vérifier que unsubscribe a été appelé
    expect((component as any).subscription.unsubscribe).toHaveBeenCalled();
  });
});