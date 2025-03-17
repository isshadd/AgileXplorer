import { Component, OnInit, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

interface RobotPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface RobotTrail {
  robotId: string;
  positions: RobotPosition[];
  color: string;
  isDragging?: boolean;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private subscription: Subscription = new Subscription();
  private readonly colors = ['#FF0000', '#00FF00', '#0000FF', '#FF00FF'];
  public robotTrails: Map<string, RobotTrail> = new Map();
  private scale = 50;
  private centerX = 0;
  private centerY = 0;
  private readonly ZOOM_FACTOR = 1.2;
  private readonly MIN_SCALE = 10;
  private readonly MAX_SCALE = 200;
  private readonly ROBOT_RADIUS = 5;
  private backgroundImage: HTMLImageElement | null = null;
  private selectedRobot: RobotTrail | null = null;

  constructor(private websocketService: WebSocketService) {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  ngOnInit(): void {
    this.subscription.add(
      this.websocketService.onRobotPosition().subscribe((data: { robotId: string; position: RobotPosition }) => {
        this.updateRobotPosition(data.robotId, {
          x: data.position.x,
          y: data.position.y,
          timestamp: data.position.timestamp
        });
      })
    );
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();

    // Ajout des gestionnaires d'événements pour le drag and drop
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);

    // Load background image
    this.backgroundImage = new Image();
    this.backgroundImage.src = '/map.png';
    this.backgroundImage.onload = () => {
      this.startDrawLoop();
    };
  }

  ngOnDestroy(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    canvas.removeEventListener('mousemove', this.handleMouseMove);
    canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.subscription.unsubscribe();
  }

  private handleMouseDown(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Vérifier si un robot est cliqué
    this.robotTrails.forEach(trail => {
      if (!trail.positions.length) return;

      const lastPos = trail.positions[trail.positions.length - 1];
      const robotX = this.centerX + lastPos.x * this.scale;
      const robotY = this.centerY - lastPos.y * this.scale;

      if (Math.hypot(mouseX - robotX, mouseY - robotY) <= this.ROBOT_RADIUS * 2) {
        trail.isDragging = true;
        this.selectedRobot = trail;
      }
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.selectedRobot?.isDragging) {
      const canvas = this.canvasRef.nativeElement;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Convertir les coordonnées de la souris en coordonnées de la carte
      const x = (mouseX - this.centerX) / this.scale;
      const y = (this.centerY - mouseY) / this.scale;

      // Mettre à jour la position du robot
      const newPosition: RobotPosition = {
        x,
        y,
        timestamp: Date.now()
      };

      // Mettre à jour l'affichage
      this.updateRobotPosition(this.selectedRobot.robotId, newPosition);

      // Envoyer la nouvelle position au serveur
      this.websocketService.sendStartPosition(this.selectedRobot.robotId, { x, y });
    }
  }

  private handleMouseUp(): void {
    if (this.selectedRobot) {
      this.selectedRobot.isDragging = false;
      this.selectedRobot = null;
    }
  }

  private updateRobotPosition(robotId: string, position: RobotPosition): void {
    if (!this.robotTrails.has(robotId)) {
      this.robotTrails.set(robotId, {
        robotId,
        positions: [],
        color: this.colors[this.robotTrails.size % this.colors.length]
      });
    }
    
    const trail = this.robotTrails.get(robotId)!;
    // Si le robot n'est pas en train d'être déplacé, stocker la position
    if (!trail.isDragging) {
      trail.positions.push(position);
    } else {
      // Si le robot est en train d'être déplacé, mettre à jour sa dernière position
      trail.positions = [position];
    }
  }

  private startDrawLoop(): void {
    const draw = () => {
      this.drawMap();
      requestAnimationFrame(draw);
    };
    draw();
  }

  private drawMap(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.backgroundImage) {
      const scaledWidth = canvas.width;
      const scaledHeight = canvas.height;
      
      this.ctx.save();
      this.ctx.translate(this.centerX, this.centerY);
      this.ctx.scale(this.scale / 50, this.scale / 50);
      this.ctx.translate(-scaledWidth/2, -scaledHeight/2);
      this.ctx.drawImage(this.backgroundImage, 0, 0, scaledWidth, scaledHeight);
      this.ctx.restore();
    }

    this.robotTrails.forEach(trail => {
      this.drawRobotTrail(trail);
    });
  }

  private drawRobotTrail(trail: RobotTrail): void {
    if (!trail.positions.length) return;

    // Dessiner le parcours seulement si le robot n'est pas en train d'être déplacé
    if (!trail.isDragging && trail.positions.length >= 2) {
      this.ctx.strokeStyle = trail.color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();

      trail.positions.forEach((pos, index) => {
        const x = this.centerX + pos.x * this.scale;
        const y = this.centerY - pos.y * this.scale;
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      this.ctx.stroke();
    }

    // Dessiner la position actuelle du robot
    const lastPos = trail.positions[trail.positions.length - 1];
    const x = this.centerX + lastPos.x * this.scale;
    const y = this.centerY - lastPos.y * this.scale;

    this.ctx.fillStyle = trail.color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.ROBOT_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();

    // Indiquer visuellement si le robot est sélectionné
    if (trail.isDragging) {
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Afficher l'ID du robot
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(trail.robotId, x + 10, y - 10);
  }

  public zoomIn(): void {
    this.scale = Math.min(this.scale * this.ZOOM_FACTOR, this.MAX_SCALE);
    this.drawMap();
  }

  public zoomOut(): void {
    this.scale = Math.max(this.scale / this.ZOOM_FACTOR, this.MIN_SCALE);
    this.drawMap();
  }

  public resetView(): void {
    this.scale = 50;
    this.centerX = this.canvasRef.nativeElement.width / 2;
    this.centerY = this.canvasRef.nativeElement.height / 2;
    this.drawMap();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
  }
}