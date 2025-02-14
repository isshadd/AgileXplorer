import { Injectable, Logger } from '@nestjs/common';
import { Mission } from '../interfaces/mission.interface';
import { v4 as uuidv4 } from 'uuid';
import * as rclnodejs from 'rclnodejs';

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);
  private missions: Map<string, Mission> = new Map();
  private currentMission: Mission | null = null;
  // On stocke les noeuds et publishers dans des Maps
  private nodes: Map<string, any> = new Map();
  private publishers: Map<string, any> = new Map();
  private initPromise: Promise<void>;

  constructor() {
    // Initialiser rclnodejs une seule fois
    this.initPromise = rclnodejs.init()
      .then(() => {
        // Liste des identifiants de robots à gérer
        const robotIds = ['robot1_102', 'robot2_102'];
        robotIds.forEach((robotId) => {
          // Création du noeud et du publisher pour les missions
          const missionNode = rclnodejs.createNode(`mission_service_node_${robotId}`);
          const missionPublisher = missionNode.createPublisher('std_msgs/msg/String', `/${robotId}/messages`);
          rclnodejs.spin(missionNode);
          this.nodes.set(`${robotId}_mission`, missionNode);
          this.publishers.set(`${robotId}_mission`, missionPublisher);
          this.logger.log(`Noeud de mission créé pour ${robotId}`);

          // Création du noeud et du publisher pour l’identification
          const identificationNode = rclnodejs.createNode(`identification_service_node_${robotId}`);
          const identificationPublisher = identificationNode.createPublisher('std_msgs/msg/Empty', `/${robotId}/identify`);
          rclnodejs.spin(identificationNode);
          this.nodes.set(`${robotId}_identification`, identificationNode);
          this.publishers.set(`${robotId}_identification`, identificationPublisher);
          this.logger.log(`Noeud d’identification créé pour ${robotId}`);
        });
        this.logger.log('rclnodejs initialisé et tous les noeuds sont en exécution');
      })
      .catch((err) => {
        this.logger.error('Échec de l’init de rclnodejs', err);
      });
  }

  async startMission(robotId: string): Promise<{ message: string }> {
    await this.initPromise;
    this.logger.log(`Démarrage de la mission pour ${robotId}`);
    // Sélection du publisher de mission pour le robot concerné
    const publisherKey = `${robotId}_mission`;
    const publisher = this.publishers.get(publisherKey);
    if (!publisher) {
      this.logger.error(`Aucun publisher de mission trouvé pour ${robotId}`);
      return { message: `Aucun publisher de mission trouvé pour ${robotId}` };
    }
    const message = {
      data: JSON.stringify({ action: 'start_mission', robot_id: robotId }),
    };
    publisher.publish(message);
    this.logger.log(`Message start_mission publié sur /${robotId}/messages`);
    return { message: `Mission démarrée pour ${robotId}` };
  }

  async stopMission(robotId: string): Promise<{ message: string }> {
    await this.initPromise;
    this.logger.log(`Arrêt de la mission pour ${robotId}`);
    const publisherKey = `${robotId}_mission`;
    const publisher = this.publishers.get(publisherKey);
    if (!publisher) {
      this.logger.error(`Aucun publisher de mission trouvé pour ${robotId}`);
      return { message: `Aucun publisher de mission trouvé pour ${robotId}` };
    }
    const message = {
      data: JSON.stringify({ action: 'end_mission', robot_id: robotId }),
    };
    publisher.publish(message);
    this.logger.log(`Message end_mission publié sur /${robotId}/messages`);
    return { message: `Mission arrêtée pour ${robotId}` };
  }

  async identify(robotId: string): Promise<{ message: string }> {
    await this.initPromise;
    this.logger.log(`Envoi du signal d’identification pour ${robotId}`);
    const publisherKey = `${robotId}_identification`;
    const publisher = this.publishers.get(publisherKey);
    if (!publisher) {
      this.logger.error(`Aucun publisher d’identification trouvé pour ${robotId}`);
      return { message: `Aucun publisher d’identification trouvé pour ${robotId}` };
    }
    const message = {
      data: JSON.stringify({ action: 'identify', robot_id: robotId }),
    };
    publisher.publish(message);
    this.logger.log(`Message d’identification publié sur /${robotId}/messages`);
    return { message: `Signal d’identification envoyé pour ${robotId}` };
  }
}
