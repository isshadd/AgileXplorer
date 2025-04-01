import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  missionStarted(): void {
    this.snackBar.open('Mission démarrée', 'Fermer', {
      duration: 3000
    });
  }

  missionEnded(): void {
    this.snackBar.open('Mission terminée', 'Fermer', {
      duration: 3000
    });
  }

  identifySignal(): void {
    this.snackBar.open('Signal d\'identification envoyé', 'Fermer', {
      duration: 3000
    });
  }

  returnToBase(): void {
    this.snackBar.open('Retour à la base initié', 'Fermer', {
      duration: 3000
    });
  }

  p2pStateChanged(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000
    });
  }
}