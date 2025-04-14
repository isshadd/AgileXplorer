import { Component, OnInit, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';



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

interface MapData {
  resolution: number;
  width: number;
  height: number;
  origin: {
    x: number;
    y: number;
    z: number;
    orientation: {
      x: number;
      y: number;
      z: number;
      w: number;
    }
  };
  data: number[];
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatTooltipModule,
  ]
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
  public displayMode: 'background' | 'mapping' = 'background';

  public toggleDisplayMode(): void {
    this.displayMode = this.displayMode === 'background' ? 'mapping' : 'background';
    this.drawMap();
  }

  private scale = 50;
  private centerX = 0;
  private centerY = 0;
  private readonly ZOOM_FACTOR = 1.2;
  private readonly MIN_SCALE = 10;
  private readonly MAX_SCALE = 200;
  private backgroundImage: HTMLImageElement | null = null;
  
  // Structure pour gérer les cartes SLAM de chaque robot
  private robotMaps: Map<string, {
    mapData: MapData;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  }> = new Map();

  constructor(private websocketService: WebSocketService) {}

  get isController(): boolean {
    return this.websocketService.isControllerClient();
  }

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
    
    // S'abonner aux données des cartes (lidar)
    this.subscription.add(
      this.websocketService.onMapData().subscribe((data: { robotId: string; mapData: MapData }) => {
        console.log(`MapComponent: Données lidar reçues du robot ${data.robotId}:`, data.mapData.width, 'x', data.mapData.height);
        this.updateRobotMap(data.robotId, data.mapData);
      })
    );
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();

    // Ne plus créer de canvas ici car ils seront créés par robot

    this.backgroundImage = new Image();
    this.backgroundImage.src = '/map.png';
    this.backgroundImage.onload = () => {
      this.startDrawLoop();
    };

    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  // Méthode pour rendre les données du lidar
  // Méthode pour mettre à jour la carte d'un robot
  private updateRobotMap(robotId: string, mapData: MapData): void {
    console.log(`updateRobotMap: Mise à jour de la carte du robot ${robotId}`);
    
    // Créer une nouvelle entrée si elle n'existe pas
    if (!this.robotMaps.has(robotId)) {
      const canvas = document.createElement('canvas');
      canvas.width = this.canvasRef.nativeElement.width;
      canvas.height = this.canvasRef.nativeElement.height;
      const ctx = canvas.getContext('2d')!;
      
      this.robotMaps.set(robotId, {
        mapData: mapData,
        canvas: canvas,
        ctx: ctx
      });
    }

    const robotMap = this.robotMaps.get(robotId)!;
    robotMap.mapData = mapData;
    robotMap.ctx.clearRect(0, 0, robotMap.canvas.width, robotMap.canvas.height);

    // Render this robot's map
    this.renderMapData(robotId);
  }

  private renderMapData(robotId: string): void {
    console.log(`renderMapData: Début du rendu pour le robot ${robotId}`);
    const robotMap = this.robotMaps.get(robotId);
    if (!robotMap) {
      console.warn(`renderMapData: Pas de données pour le robot ${robotId}`);
      return;
    }
    
    const { mapData, canvas, ctx } = robotMap;
    
    // Effacer le canvas de la carte
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculer l'échelle et la position
    const mapWidthWorld = mapData.width * mapData.resolution;
    const mapHeightWorld = mapData.height * mapData.resolution;
    console.log(`renderMapData (${robotId}): Dimensions monde:`, { mapWidthWorld, mapHeightWorld, resolution: mapData.resolution });
    
    // Créer une image à partir des données de la grille
    const imageData = ctx.createImageData(
      mapData.width,
      mapData.height
    );
    
    // Compter les différents types de cellules pour le débogage
    let unknownCells = 0;
    let freeCells = 0;
    let occupiedCells = 0;
    
    // Parcourir les données de la grille
    for (let i = 0; i < mapData.data.length; i++) {
      const value = mapData.data[i];
      const xPos: number = i % mapData.width;
      const yPos: number = Math.floor(i / mapData.width);
      const idx = (yPos * mapData.width + xPos) * 4;
      
      // Définir la couleur en fonction de la valeur et du robot
      if (value === -1) {
        // Zone inconnue - très transparent
        imageData.data[idx] = robotId === '1' ? 255 : 0;     // R
        imageData.data[idx + 1] = robotId === '2' ? 255 : 0; // G
        imageData.data[idx + 2] = 0;                         // B
        imageData.data[idx + 3] = 0;                         // Transparent
        unknownCells++;
      } else if (value === 0) {
        // Zone libre - semi-transparent avec couleur du robot
        imageData.data[idx] = robotId === '1' ? 255 : 0;     // R
        imageData.data[idx + 1] = robotId === '2' ? 255 : 0; // G
        imageData.data[idx + 2] = 0;                         // B
        imageData.data[idx + 3] = 40;                        // Légèrement visible
        freeCells++;
      } else {
        // Zone occupée - plus opaque avec couleur du robot
        const intensity = Math.min(255, Math.floor(value * 2.55));
        const alpha = 100 + Math.floor(intensity * 0.6); // Plus intense = plus opaque
        
        imageData.data[idx] = robotId === '1' ? 255 : 0;     // R
        imageData.data[idx + 1] = robotId === '2' ? 255 : 0; // G
        imageData.data[idx + 2] = 0;                         // B
        imageData.data[idx + 3] = alpha;                     // Semi-opaque à opaque
        occupiedCells++;
      }
    }
    
    console.log(`renderMapData (${robotId}): Statistiques cellules:`, {
      total: mapData.data.length,
      inconnu: unknownCells,
      libre: freeCells,
      occupé: occupiedCells
    });
    
    // Créer une image temporaire à partir des données
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = mapData.width;
    tmpCanvas.height = mapData.height;
    const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true })!;
    tmpCtx.putImageData(imageData, 0, 0);
    
    // Dessiner l'image transformée sur le canvas de la carte
    ctx.save();
    
    // Calcul pour aligner les coordonnées de la grille avec le monde
    const originX = this.centerX + mapData.origin.x * this.scale;
    const originY = this.centerY - mapData.origin.y * this.scale;
    const scaledResolution = mapData.resolution * this.scale;
    
    console.log(`renderMapData (${robotId}): Transformations:`, {
      centerX: this.centerX,
      centerY: this.centerY,
      originX,
      originY,
      scaledResolution,
      mapWidth: mapData.width,
      mapHeight: mapData.height,
      scale: this.scale,
      robotId
    });
    
    ctx.translate(originX, originY);
    ctx.scale(scaledResolution, -scaledResolution);
    ctx.drawImage(tmpCanvas, 0, 0);
    
    ctx.restore();
    
    console.log('renderMapData: Rendu terminé');
    // Forcer la mise à jour de l'affichage
    this.drawMap();
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
    console.log('drawMap: Début du rafraîchissement');
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.displayMode === 'background' && this.backgroundImage) {
      const scaledWidth = canvas.width;
      const scaledHeight = canvas.height;
      
      this.ctx.save();
      this.ctx.translate(this.centerX, this.centerY);
      this.ctx.scale(this.scale / 50, this.scale / 50);
      this.ctx.translate(-scaledWidth/2, -scaledHeight/2);
      this.ctx.drawImage(this.backgroundImage, 0, 0, scaledWidth, scaledHeight);
      this.ctx.restore();
      console.log('drawMap: Arrière-plan dessiné');

      // Afficher les robots uniquement en mode background
      this.robotTrails.forEach(trail => {
        this.drawRobotTrail(trail);
      });
      console.log('drawMap: Trajectoires des robots dessinées');
    } else if (this.displayMode === 'mapping') {
      // En mode cartographie, superposer les cartes SLAM
      console.log('drawMap: Superposition des cartes SLAM');
      
      // Dessiner d'abord la légende des cartes SLAM
      const legendY = 30;
      this.ctx.font = '14px Arial';
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      this.ctx.fillText('Robot 1 - Zones explorées', 10, legendY);
      this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      this.ctx.fillText('Robot 2 - Zones explorées', 10, legendY + 20);

      // Superposer les cartes SLAM avec le même système de coordonnées
      this.robotMaps.forEach((robotMap, robotId) => {
        this.ctx.save();
        
        // Utiliser des couleurs et opacités optimisées pour la lisibilité
        if (robotId === '1') {
          // Rouge semi-transparent pour robot 1
          this.ctx.globalCompositeOperation = 'source-over';
          this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        } else {
          // Vert semi-transparent pour robot 2
          this.ctx.globalCompositeOperation = 'multiply';
          this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        }
        
        // Assurer que l'échelle et l'origine sont identiques pour les deux robots
        const scale = Math.min(
          canvas.width / robotMap.mapData.width,
          canvas.height / robotMap.mapData.height
        );
        
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.scale(scale, scale);
        this.ctx.translate(
          -robotMap.mapData.width / 2,
          -robotMap.mapData.height / 2
        );
        
        this.ctx.drawImage(robotMap.canvas, 0, 0);
        this.ctx.restore();
      });

      // Ajouter une bordure pour délimiter la zone de cartographie
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
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