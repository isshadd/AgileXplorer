import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<ConfirmationDialogComponent>>;

  const testMessage = 'Êtes-vous sûr de vouloir continuer?';

  beforeEach(async () => {
    // Créer un mock pour MatDialogRef
    dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { message: testMessage } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('devrait avoir le message correct depuis les données injectées', () => {
    expect(component.data.message).toEqual(testMessage);
  });

  it('devrait fermer le dialogue avec false quand on clique sur Non', () => {
    // Appeler la méthode onNoClick
    component.onNoClick();
    
    // Vérifier que la méthode close du dialogRef a été appelée avec false
    expect(dialogRefMock.close).toHaveBeenCalledWith(false);
  });

  it('devrait fermer le dialogue avec true quand on clique sur Oui', () => {
    // Appeler la méthode onYesClick
    component.onYesClick();
    
    // Vérifier que la méthode close du dialogRef a été appelée avec true
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });
});