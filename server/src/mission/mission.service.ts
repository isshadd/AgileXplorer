import { Injectable, Logger } from '@nestjs/common';
import { Mission } from '../interfaces/mission.interface';
// import { v4 as uuidv4 } from 'uuid';
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
    this.initPromise = rclnodejs
      .init()
      .then(() => {
        // Liste des identifiants de robots à gérer
        const robotIds = ['robot1_102', 'robot2_102'];
        robotIds.forEach((robotId) => {
          // Création du noeud et du publisher pour les missions
          const missionNode = rclnodejs.createNode(
            `mission_service_node_${robotId}`,
          );
          const missionPublisher = missionNode.createPublisher(
            'std_msgs/msg/String',
            `/${robotId}/messages`,
          );
          rclnodejs.spin(missionNode);
          this.nodes.set(`${robotId}_mission`, missionNode);
          this.publishers.set(`${robotId}_mission`, missionPublisher);
          this.logger.log(`Noeud de mission créé pour ${robotId}`);

          // Création du noeud et du publisher pour l’identification
          const identificationNode = rclnodejs.createNode(
            `identification_service_node_${robotId}`,
          );
          const identificationPublisher = identificationNode.createPublisher(
            'std_msgs/msg/Empty',
            `/${robotId}/identify`,
          );
          rclnodejs.spin(identificationNode);
          this.nodes.set(`${robotId}_identification`, identificationNode);
          this.publishers.set(
            `${robotId}_identification`,
            identificationPublisher,
          );
          this.logger.log(`Noeud d’identification créé pour ${robotId}`);
        });
        this.logger.log(
          'rclnodejs initialisé et tous les noeuds sont en exécution',
        );
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
      this.logger.error(
        `Aucun publisher d’identification trouvé pour ${robotId}`,
      );
      return {
        message: `Aucun publisher d’identification trouvé pour ${robotId}`,
      };
    }
    const message = {
      data: JSON.stringify({ action: 'identify', robot_id: robotId }),
    };
    publisher.publish(message);
    this.logger.log(`Message d’identification publié sur /${robotId}/messages`);
    return { message: `Signal d’identification envoyé pour ${robotId}` };
  }

  async startMissionsAll(): Promise<{ message: string }> {
    await this.initPromise;
    this.logger.log(`Démarrage de la mission pour tous les robots`);
    const responses: string[] = [];
    // Itérer sur tous les publishers de mission
    this.publishers.forEach((publisher, key) => {
      if (key.endsWith('_mission')) {
        // Récupérer l'identifiant du robot (la partie avant "_mission")
        const robotId = key.split('_mission')[0];
        const message = {
          data: JSON.stringify({ action: 'start_mission', robot_id: robotId }),
        };
        publisher.publish(message);
        this.logger.log(
          `Message start_mission publié sur /${robotId}/messages`,
        );
        responses.push(`Mission démarrée pour ${robotId}`);
      }
    });
    return { message: responses.join(' | ') };
  }

  async stopMissionsAll(): Promise<{ message: string }> {
    await this.initPromise;
    this.logger.log(`Arrêt de la mission pour tous les robots`);
    const responses: string[] = [];
    this.publishers.forEach((publisher, key) => {
      if (key.endsWith('_mission')) {
        const robotId = key.split('_mission')[0];
        const message = {
          data: JSON.stringify({ action: 'end_mission', robot_id: robotId }),
        };
        publisher.publish(message);
        this.logger.log(`Message end_mission publié sur /${robotId}/messages`);
        responses.push(`Mission arrêtée pour ${robotId}`);
      }
    });
    return { message: responses.join(' | ') };
  }

  async returnToBase(robotId: string): Promise<{ message: string }> {
    await this.initPromise;
    this.logger.log(`Retour à la base pour ${robotId}`);
    const publisherKey = `${robotId}_mission`;
    const publisher = this.publishers.get(publisherKey);
    if (!publisher) {
      this.logger.error(`Aucun publisher trouvé pour ${robotId}`);
      return { message: `Aucun publisher trouvé pour ${robotId}` };
    }
    const message = {
      data: JSON.stringify({ action: 'return_to_base', robot_id: robotId }),
    };
    publisher.publish(message);
    this.logger.log(`Message return_to_base publié sur /${robotId}/messages`);
    return { message: `Retour à la base initié pour ${robotId}` };
  }

  async setWheelMode(
    robotId: string,
    mode: 'ackerman' | 'differential',
  ): Promise<{ message: string }> {
    await this.initPromise;
    this.logger.log(`Changement de mode de roues pour ${robotId}: ${mode}`);
    const publisherKey = `${robotId}_mission`;
    const publisher = this.publishers.get(publisherKey);
    if (!publisher) {
      this.logger.error(`Aucun publisher trouvé pour ${robotId}`);
      return { message: `Aucun publisher trouvé pour ${robotId}` };
    }
    const message = {
      data: JSON.stringify({
        action: 'set_wheel_mode',
        mode,
        robot_id: robotId,
      }),
    };
    publisher.publish(message);
    this.logger.log(`Message set_wheel_mode publié sur /${robotId}/messages`);
    return { message: `Mode de roues changé pour ${robotId}: ${mode}` };
  }

  async getRobotStates(): Promise<any[]> {
    // Cette méthode retourne l'état actuel des robots
    return Array.from(this.nodes.keys())
      .filter((key) => key.endsWith('_mission'))
      .map((key) => {
        const robotId = key.split('_mission')[0];
        return {
          robotId,
          status: 'active',
          position: { x: 0, y: 0 },
          battery: 100,
        };
      });
  }
}
