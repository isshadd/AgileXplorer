import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectedClientsComponent } from './connected-clients.component';
import { WebSocketService } from '../../services/websocket.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ConnectedClientsComponent', () => {
  let component: ConnectedClientsComponent;
  let fixture: ComponentFixture<ConnectedClientsComponent>;
  let websocketServiceMock: jasmine.SpyObj<WebSocketService>;

  beforeEach(async () => {
    // Créer un mock pour WebSocketService
    websocketServiceMock = jasmine.createSpyObj('WebSocketService', [
      'onClientCountUpdate',
      'emit'
    ]);
    
    // Configurer le retour de la méthode mockée
    websocketServiceMock.onClientCountUpdate.and.returnValue(of({
      count: 3,
      isController: false
    }));
    
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        { provide: WebSocketService, useValue: websocketServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectedClientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Déclenche ngOnInit
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait appeler emit avec GET_CLIENT_COUNT lors de l\'initialisation', () => {
    expect(websocketServiceMock.emit).toHaveBeenCalledWith('GET_CLIENT_COUNT', {});
  });

  it('devrait mettre à jour clientCount et isController avec les valeurs du service', () => {
    expect(component.clientCount).toBe(3);
    expect(component.isController).toBe(false);
  });
});