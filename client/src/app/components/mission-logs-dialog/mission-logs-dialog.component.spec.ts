import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MissionLogsDialogComponent } from './mission-logs-dialog.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

describe('MissionLogsDialogComponent', () => {
  let component: MissionLogsDialogComponent;
  let fixture: ComponentFixture<MissionLogsDialogComponent>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<MissionLogsDialogComponent>>;

  // Données de test pour les logs
  const mockLogs = [
    {
      type: 'COMMAND',
      robotId: 'limo1',
      timestamp: '2025-04-14T10:00:00.000Z',
      data: { command: 'START_MISSION' }
    },
    {
      type: 'SENSOR',
      robotId: 'limo1',
      timestamp: '2025-04-14T10:15:00.000Z',
      data: {
        distance: 0.5,
        position: { x: 1.2, y: 3.4, z: 0 }
      }
    }
  ];

  beforeEach(async () => {
    // Créer un mock pour MatDialogRef
    dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatDialogModule,
        MatCardModule,
        MatListModule,
        MatIconModule,
        MatButtonModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { missionId: 'mission-123', logs: mockLogs } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MissionLogsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('devrait avoir les données injectées correctes', () => {
    expect(component.data.missionId).toEqual('mission-123');
    expect(component.data.logs).toEqual(mockLogs);
    expect(component.data.logs.length).toBe(2);
  });

  it('devrait fermer le dialogue quand la méthode close est appelée', () => {
    // Appeler la méthode close
    component.close();
    
    // Vérifier que la méthode close du dialogRef a été appelée
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});