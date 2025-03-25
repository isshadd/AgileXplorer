import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../services/websocket.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-connected-clients',
  templateUrl: './connected-clients.component.html',
  styleUrls: ['./connected-clients.component.css'],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class ConnectedClientsComponent implements OnInit, OnDestroy {
  
  clientCount: number = 1; // Par défaut, au moins 1 client (soi-même)
  isController: boolean = true; // Par défaut, le premier client est le contrôleur
  private connectionsSubscription?: Subscription;

  constructor(private websocketService: WebSocketService) {}

  ngOnInit(): void {
    // S'abonner aux mises à jour du nombre de clients
    this.connectionsSubscription = this.websocketService.onClientCountUpdate().subscribe(
      (data: {count: number, isController: boolean}) => {
        this.clientCount = data.count;
        this.isController = data.isController;
      }
    );
    
    // Demander le nombre actuel de clients connectés et le statut de contrôle
    this.websocketService.emit('GET_CLIENT_COUNT', {});
  }

  ngOnDestroy(): void {
    if (this.connectionsSubscription) {
      this.connectionsSubscription.unsubscribe();
    }
  }
}