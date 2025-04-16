import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlPanelComponent } from './control-panel.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ControlPanelComponent', () => {
  let component: ControlPanelComponent;
  let fixture: ComponentFixture<ControlPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA], // Pour ignorer les éléments personnalisés dans le template
    }).compileComponents();

    fixture = TestBed.createComponent(ControlPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });
  
  // Puisque ce composant n'a pas de logique pour l'instant, 
  // nous nous assurons simplement qu'il peut être créé sans erreur.
  // Des tests supplémentaires pourront être ajoutés lorsque des fonctionnalités
  // seront implémentées dans ce composant.
});
