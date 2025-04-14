import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpDialogComponent } from './help-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('HelpDialogComponent', () => {
  let component: HelpDialogComponent;
  let fixture: ComponentFixture<HelpDialogComponent>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<HelpDialogComponent>>;

  beforeEach(async () => {
    // Créer un mock pour le MatDialogRef
    dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);
    
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA], // Pour ignorer les éléments personnalisés dans le template
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HelpDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });
  
  it('devrait fermer la boîte de dialogue quand close() est appelé', () => {
    // Appeler la méthode close
    component.close();
    
    // Vérifier que la méthode close du dialogRef a été appelée
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});