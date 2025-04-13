import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly defaultDuration = 3000;
  private readonly errorDuration = 5000;
  constructor(private snackBar: MatSnackBar) {}

  missionStarted(): void {
    this.showSuccess('Mission démarrée', 'La mission d\'exploration a démarré avec succès.');
  }

  missionEnded(): void {
    this.showSuccess('Mission terminée', 'La mission a été arrêtée avec succès.');
  }

  identifySignal(): void {
    this.showSuccess('Signal d\'identification envoyé', 'Le robot devrait émettre un son pour vous permettre de l\'identifier.');
  }

  returnToBase(): void {
    this.showSuccess('Retour à la base initié', 'Le robot va maintenant retourner à sa position de départ.');
  }
  
  // Nouvelles méthodes pour les erreurs et avertissements
  
  robotConnectionError(robotId: string): void {
    this.showError(
      `Erreur de connexion - ${robotId}`,
      `Impossible de se connecter au robot ${robotId}. Vérifiez que le robot est allumé et connecté au réseau.`
    );
  }
  
  missionStartError(reason: string = 'erreur inconnue'): void {
    this.showError(
      'Erreur de démarrage de mission',
      `La mission n'a pas pu démarrer en raison d'une ${reason}. Essayez d'identifier à nouveau le robot ou redémarrez-le si nécessaire.`
    );
  }
  
  lowBatteryWarning(robotId: string, level: number): void {
    this.showWarning(
      'Niveau de batterie faible',
      `Le robot ${robotId} a un niveau de batterie à ${level}%. Envisagez de terminer la mission et de recharger le robot.`
    );
  }
  
  navigationObstacleDetected(): void {
    this.showWarning(
      'Obstacle détecté',
      'Le robot a détecté un obstacle sur son chemin et tente de le contourner. Surveillez sa progression ou intervenez si nécessaire.'
    );
  }
  
  missionCompleted(robotId: string): void {
    this.showSuccess(
      'Mission complétée',
      `Le robot ${robotId} a exploré avec succès toutes les zones accessibles et a complété sa mission.`,
      5000
    );
  }
  
  // Méthodes privées d'assistance
  
  private showSuccess(title: string, message: string, duration: number = this.defaultDuration): void {
    const config: MatSnackBarConfig = {
      duration: duration,
      panelClass: ['success-snackbar']
    };
    
    this.snackBar.open(`${title} - ${message}`, 'Fermer', config);
  }
  
  private showWarning(title: string, message: string, duration: number = this.defaultDuration): void {
    const config: MatSnackBarConfig = {
      duration: duration,
      panelClass: ['warning-snackbar']
    };
    
    this.snackBar.open(`${title} - ${message}`, 'Fermer', config);
  }
  
  private showError(title: string, message: string, duration: number = this.errorDuration): void {
    const config: MatSnackBarConfig = {
      duration: duration,
      panelClass: ['error-snackbar']
    };
    
    this.snackBar.open(`${title} - ${message}`, 'Fermer', config);
  }

  p2pStateChanged(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000
    });
  }

  warning(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['warning-snackbar']
    });
  }
}