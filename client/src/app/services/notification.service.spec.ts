import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    // Créer un jasmine spy pour MatSnackBar
    const spy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: spy }
      ]
    });
    
    service = TestBed.inject(NotificationService);
    snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  describe('Notifications de mission', () => {
    it('devrait afficher une notification lorsqu\'une mission démarre', () => {
      service.missionStarted();
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Mission démarrée/),
        'Fermer',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: ['success-snackbar']
        })
      );
    });

    it('devrait afficher une notification lorsqu\'une mission se termine', () => {
      service.missionEnded();
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Mission terminée/),
        'Fermer',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: ['success-snackbar']
        })
      );
    });
    
    it('devrait afficher une notification de complétion de mission', () => {
      const robotId = 'robot1';
      service.missionCompleted(robotId);
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Mission complétée.*robot1/),
        'Fermer',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: ['success-snackbar']
        })
      );
    });
    
    it('devrait afficher une erreur de démarrage de mission', () => {
      service.missionStartError('connexion perdue');
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Erreur de démarrage.*connexion perdue/),
        'Fermer',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: ['error-snackbar']
        })
      );
    });
  });

  describe('Notifications de robot', () => {
    it('devrait afficher une notification d\'identification', () => {
      service.identifySignal();
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Signal d'identification/),
        'Fermer',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: ['success-snackbar']
        })
      );
    });

    it('devrait afficher une notification de retour à la base', () => {
      service.returnToBase();
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Retour à la base/),
        'Fermer',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: ['success-snackbar']
        })
      );
    });
    
    it('devrait afficher une erreur de connexion robot', () => {
      service.robotConnectionError('robot2');
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Erreur de connexion.*robot2/),
        'Fermer',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: ['error-snackbar']
        })
      );
    });
    
    it('devrait afficher un avertissement de batterie faible', () => {
      service.lowBatteryWarning('robot3', 15);
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Niveau de batterie faible.*robot3.*15%/),
        'Fermer',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: ['warning-snackbar']
        })
      );
    });
    
    it('devrait afficher un avertissement d\'obstacle', () => {
      service.navigationObstacleDetected();
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/Obstacle détecté/),
        'Fermer',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: ['warning-snackbar']
        })
      );
    });
  });
  
  describe('Notifications P2P et génériques', () => {
    it('devrait afficher un changement d\'état P2P', () => {
      const message = 'Communication P2P activée';
      service.p2pStateChanged(message);
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        message,
        'Fermer',
        jasmine.objectContaining({ duration: 3000 })
      );
    });
    
    it('devrait afficher un avertissement générique', () => {
      const message = 'Attention : opération risquée';
      service.warning(message);
      
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        message,
        'Fermer',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: ['warning-snackbar']
        })
      );
    });
  });
});