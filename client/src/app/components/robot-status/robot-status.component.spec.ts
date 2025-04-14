import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RobotStatusComponent } from './robot-status.component';

describe('RobotStatusComponent', () => {
  let component: RobotStatusComponent;
  let fixture: ComponentFixture<RobotStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Ce composant est très simple, pas besoin d'imports ou de providers
    }).compileComponents();

    fixture = TestBed.createComponent(RobotStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });
});
