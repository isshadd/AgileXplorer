import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Mission } from '../interfaces/mission.interface';
import { LogsService } from '../logs/logs.service';
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
  private activeMissionId: string | null = null;

  constructor(private readonly logsService: LogsService) {
    // Initialiser rclnodejs une seule fois
    this.initPromise = rclnodejs
      .init()
      .then(() => {
        // Liste des identifiants de robots à gérer
        const robotIds = ['limo1', 'limo2'];
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

  startMission() {
    this.activeMissionId = uuidv4();
    this.logger.log(`Starting mission with ID: ${this.activeMissionId}`);

    // Initialize mission log
    this.logsService
      .initializeMissionLog(this.activeMissionId)
      .then(() => {
        // Liste des identifiants de robots à gérer
        const robotIds = ['limo1', 'limo2'];
        robotIds.forEach((robotId) => {
          this.logsService.addLog(this.activeMissionId, {
            type: 'COMMAND',
            robotId: robotId,
            data: {
              command: 'START_MISSION',
              timestamp: new Date().toISOString(),
            },
          });
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

    return { missionId: this.activeMissionId };
  }

  async stopMission() {
    const stoppedMissionId = this.activeMissionId;
    this.logger.log(`Stopping mission with ID: ${stoppedMissionId}`);

    if (!stoppedMissionId) {
      this.logger.warn('Attempted to stop mission but no active mission found');
      return { stoppedMissionId: null };
    }

    // Clear the mission ID first to prevent any new logs
    this.activeMissionId = null;

    try {
      // Add final stop command and finalize in one operation
      await this.logsService.finalizeMissionLog(stoppedMissionId);
      this.logger.debug(`Mission log finalized`);
      return { stoppedMissionId };
    } catch (error) {
      this.logger.error(
        `Error finalizing mission log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  getActiveMissionId() {
    return this.activeMissionId;
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

  updateRobotData(
    robotId: string,
    position: { x: number; y: number; z: number },
    distance: number,
  ) {
    if (robotId) {
      // Log robot data if mission is active
      if (this.activeMissionId) {
        this.logsService
          .addLog(this.activeMissionId, {
            type: 'SENSOR',
            robotId,
            data: {
              position,
              distance,
              timestamp: new Date().toISOString(),
            },
          })
          .catch((error) => {
            this.logger.error(
              `Error logging robot data: ${error.message}`,
              error.stack,
            );
          });
      }
    }
  }

  async getMissionLogs(missionId: string) {
    this.logger.log(`Getting logs for mission ID: ${missionId}`);
    try {
      const missionLog = await this.logsService.findMissionLog(missionId);
      this.logger.debug(
        `Found mission log with ${missionLog.logs.length} entries`,
      );
      return missionLog;
    } catch (error) {
      this.logger.error(
        `Error getting mission log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
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

  async getMissions(): Promise<any[]> {
    try {
      const missionLogs = await this.logsService.findAllMissionLogs();
      return missionLogs.map((log) => ({
        id: log.missionId,
        startTime: log.startTime,
        endTime: log.endTime,
        status: log.endTime ? 'completed' : 'ongoing',
        robots: log.logs
          .filter(
            (entry) =>
              entry.type === 'COMMAND' &&
              entry.data.command === 'START_MISSION',
          )
          .map((entry) => entry.robotIds),
        logs: log.logs,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting missions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
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
