import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        NoopAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('devrait avoir 3 éléments de navigation', () => {
    expect(component.navItems.length).toBe(3);
  });

  it('devrait contenir les éléments de navigation avec les bons attributs', () => {
    // Vérifier le premier élément (Tableau de bord)
    expect(component.navItems[0].path).toBe('/dashboard');
    expect(component.navItems[0].label).toBe('Tableau de bord');
    expect(component.navItems[0].icon).toBe('dashboard');

    // Vérifier le deuxième élément (Historique)
    expect(component.navItems[1].path).toBe('/missions');
    expect(component.navItems[1].label).toBe('Historique');
    expect(component.navItems[1].icon).toBe('history');

    // Vérifier le troisième élément (Configuration)
    expect(component.navItems[2].path).toBe('/configuration');
    expect(component.navItems[2].label).toBe('Configuration');
    expect(component.navItems[2].icon).toBe('settings');
  });
});