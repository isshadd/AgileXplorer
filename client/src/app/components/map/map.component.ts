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

  public getRobotTrails(): Map<string, RobotTrail> {
    return this.robotTrails;
  }
  private scale = 50; // 1 mètre = 50 pixels
  private centerX = 0;
  private centerY = 0;
  private readonly ZOOM_FACTOR = 1.2;
  private readonly MIN_SCALE = 10;
  private readonly MAX_SCALE = 200;
  private backgroundImage: HTMLImageElement | null = null;

  constructor(private websocketService: WebSocketService) {}

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

    // Load background image
    this.backgroundImage = new Image();
    this.backgroundImage.src = '/map.png';
    this.backgroundImage.onload = () => {
      this.startDrawLoop();
    };
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
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
    trail.positions.push(position);
    
    // Garder seulement les 1000 dernières positions
    if (trail.positions.length > 1000) {
      trail.positions.shift();
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

    // Dessiner l'image de fond
    if (this.backgroundImage) {
      // Calculer la taille de l'image mise à l'échelle
      const scaledWidth = canvas.width;
      const scaledHeight = canvas.height;
      
      // Dessiner l'image centrée et mise à l'échelle
      this.ctx.save();
      this.ctx.translate(this.centerX, this.centerY);
      this.ctx.scale(this.scale / 50, this.scale / 50); // Ajuster l'échelle relative à l'échelle par défaut
      this.ctx.translate(-scaledWidth/2, -scaledHeight/2);
      this.ctx.drawImage(this.backgroundImage, 0, 0, scaledWidth, scaledHeight);
      this.ctx.restore();
    }

    // Dessiner les parcours des robots
    this.robotTrails.forEach(trail => {
      this.drawRobotTrail(trail);
    });
  }

  private drawRobotTrail(trail: RobotTrail): void {
    if (trail.positions.length < 2) return;

    this.ctx.strokeStyle = trail.color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    // Dessiner le parcours
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

    // Dessiner la position actuelle du robot
    const lastPos = trail.positions[trail.positions.length - 1];
    const x = this.centerX + lastPos.x * this.scale;
    const y = this.centerY - lastPos.y * this.scale;

    this.ctx.fillStyle = trail.color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Afficher l'ID du robot
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(trail.robotId, x + 10, y - 10);
  }
}