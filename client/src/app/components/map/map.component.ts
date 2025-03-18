import { Component, OnInit, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

interface RobotPosition {
  x: number;
  y: number;
  timestamp?: number;  // Optionnel car l'odométrie ne fournit pas toujours un timestamp
}

interface RobotTrail {
  robotId: string;
  positions: RobotPosition[];
  color: string;
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
  private isDragging = false;
  private draggedRobotId: string | null = null;
  private dragStartPos = { x: 0, y: 0 };

  private scale = 50;
  private centerX = 0;
  private centerY = 0;
  private readonly ZOOM_FACTOR = 1.2;
  private readonly MIN_SCALE = 10;
  private readonly MAX_SCALE = 200;
  private backgroundImage: HTMLImageElement | null = null;

  constructor(private websocketService: WebSocketService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.websocketService.onRobotPosition().subscribe((data: { robotId: string; position: RobotPosition }) => {
        if (data.robotId && data.position && typeof data.position.x === 'number' && typeof data.position.y === 'number') {
          this.updateRobotPosition(data.robotId, {
            x: data.position.x,
            y: data.position.y,
            timestamp: Date.now()  // Timestamp local si non fourni
          });
        }
      })
    );
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();

    this.backgroundImage = new Image();
    this.backgroundImage.src = '/map.png';
    this.backgroundImage.onload = () => {
      this.startDrawLoop();
    };

    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (const [robotId, trail] of this.robotTrails) {
      if (trail.positions.length > 0) {
        const lastPos = trail.positions[trail.positions.length - 1];
        const robotX = this.centerX + lastPos.x * this.scale;
        const robotY = this.centerY - lastPos.y * this.scale;
        const distance = Math.sqrt(Math.pow(x - robotX, 2) + Math.pow(y - robotY, 2));

        if (distance < 10) {
          this.isDragging = true;
          this.draggedRobotId = robotId;
          this.dragStartPos = { x, y };
          break;
        }
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.draggedRobotId) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const worldX = (x - this.centerX) / this.scale;
    const worldY = -(y - this.centerY) / this.scale;

    const trail = this.robotTrails.get(this.draggedRobotId);
    if (trail) {
      trail.positions = [{
        x: worldX,
        y: worldY,
        timestamp: Date.now()
      }];
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.isDragging && this.draggedRobotId) {
      const canvas = this.canvasRef.nativeElement;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const worldX = (x - this.centerX) / this.scale;
      const worldY = -(y - this.centerY) / this.scale;

      this.websocketService.emit('set_initial_position', {
        robotId: this.draggedRobotId,
        position: { x: worldX, y: worldY }
      });
    }

    this.isDragging = false;
    this.draggedRobotId = null;
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

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Calculer la dimension carrée en prenant la plus petite dimension disponible
    const maxSize = Math.min(parent.clientWidth, parent.clientHeight);
    
    canvas.width = maxSize;
    canvas.height = maxSize;
    
    // Mettre à jour le CSS du canvas pour le centrer
    canvas.style.width = `${maxSize}px`;
    canvas.style.height = `${maxSize}px`;
    
    this.centerX = maxSize / 2;
    this.centerY = maxSize / 2;
  }

  public ANGLE_OFFSET = 318.0; // Angle de correction en degrés
  public DISTANCE_FACTOR = 4.0; // Facteur multiplicateur pour ajuster les distances
  private angleInterval: any;
  private incrementSpeed = 50; // Vitesse initiale de répétition en ms
  private incrementAmount = 1.0; // Incrément initial

  // Méthode pour ajuster l'angle offset
  public setAngleOffset(angle: number): void {
    this.ANGLE_OFFSET = angle;
    this.drawMap(); // Redessiner la carte avec le nouvel angle
  }

  public startAngleIncrement(increment: number): void {
    // Annuler tout intervalle existant
    this.stopAngleIncrement();
    
    // Appliquer l'incrément initial
    this.setAngleOffset(this.ANGLE_OFFSET + increment);

    // Créer un nouvel intervalle avec accélération progressive
    let holdTime = 0;
    this.angleInterval = setInterval(() => {
      holdTime += this.incrementSpeed;
      // Augmenter la vitesse d'incrémentation avec le temps
      const speedMultiplier = Math.min(Math.floor(holdTime / 1000) + 1, 5);
      this.setAngleOffset(this.ANGLE_OFFSET + (increment * speedMultiplier));
    }, this.incrementSpeed);
  }

  public stopAngleIncrement(): void {
    if (this.angleInterval) {
      clearInterval(this.angleInterval);
      this.angleInterval = null;
    }
  }

  // Méthode pour ajuster le facteur de distance
  public setDistanceFactor(factor: number): void {
    if (factor > 0) {
      this.DISTANCE_FACTOR = factor;
      this.drawMap(); // Redessiner la carte avec le nouveau facteur
    }
  }
  
  private transformPosition(position: RobotPosition): RobotPosition {
    // Convertir l'angle en radians
    const angleRad = (this.ANGLE_OFFSET * Math.PI) / 180;
    
    // Appliquer une rotation 2D et le facteur multiplicateur
    return {
      x: (position.x * Math.cos(angleRad) - position.y * Math.sin(angleRad)) * this.DISTANCE_FACTOR,
      y: (position.x * Math.sin(angleRad) + position.y * Math.cos(angleRad)) * this.DISTANCE_FACTOR,
      timestamp: position.timestamp
    };
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
    // Transformer la position avant de l'ajouter
    const transformedPosition = this.transformPosition(position);
    trail.positions.push(transformedPosition);
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
    if (trail.positions.length === 0) return;

    // Dessiner la trajectoire
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

    // Dessiner la position actuelle
    const lastPos = trail.positions[trail.positions.length - 1];
    const x = this.centerX + lastPos.x * this.scale;
    const y = this.centerY - lastPos.y * this.scale;

    this.ctx.fillStyle = trail.color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(trail.robotId, x + 10, y - 10);
  }
}