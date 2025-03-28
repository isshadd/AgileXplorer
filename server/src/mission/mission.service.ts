import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { Mission } from '../interfaces/mission.interface';
import { LogsService } from '../logs/logs.service';
import * as rclnodejs from 'rclnodejs';

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);
  private missions: Map<string, Mission> = new Map();
  private currentMission: Mission | null = null;
  private nodes: Map<string, any> = new Map();
  private publishers: Map<string, any> = new Map();
  private initPromise: Promise<void>;
  private activeMissionId: string | null = null;
  private initialized = false;
  private robotStates: Map<string, string> = new Map([
    ['limo1', 'en arrêt'],
    ['limo2', 'en arrêt'],
  ]);

  constructor(private readonly logsService: LogsService) {
    this.initPromise = this.initializeROS();
  }

  async waitForInitialization(): Promise<void> {
    return this.initPromise;
  }

  private async initializeROS(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      try {
        await rclnodejs.init();
      } catch (error) {
        if (!error.message.includes('already been initialized')) {
          throw error;
        }
      }

      const robotIds = ['limo1', 'limo2'];
      for (const robotId of robotIds) {
        const nodeId = Math.random().toString(36).substring(7);

        // Création du noeud et du publisher pour les missions
        const missionNode = rclnodejs.createNode(
          `mission_service_node_${robotId}_${nodeId}`,
        );
        const missionPublisher = missionNode.createPublisher(
          'std_msgs/msg/String',
          `/${robotId}/messages`,
        );
        rclnodejs.spin(missionNode);
        this.nodes.set(`${robotId}_mission`, missionNode);
        this.publishers.set(`${robotId}_mission`, missionPublisher);
        this.logger.log(`Noeud de mission créé pour ${robotId}`);

        // Création du noeud et du publisher pour l'identification
        const identificationNode = rclnodejs.createNode(
          `identification_service_node_${robotId}_${nodeId}`,
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
        this.logger.log(`Noeud d'identification créé pour ${robotId}`);
      }
      this.logger.log(
        'rclnodejs initialisé et tous les noeuds sont en exécution',
      );
      this.initialized = true;
    } catch (error) {
      this.logger.error("Échec de l'initialisation de rclnodejs", error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  private logRobotStates() {
    for (const [robotId, state] of this.robotStates.entries()) {
      this.logger.verbose(`État du robot ${robotId}: ${state}`);
    }
  }

  private updateRobotState(robotId: string, state: 'en mission' | 'en arrêt') {
    this.robotStates.set(robotId, state);
    this.logger.verbose(`Mise à jour de l'état du robot ${robotId}: ${state}`);
  }

  async startMission(robotId: string) {
    await this.initPromise;
    this.activeMissionId = uuidv4();
    this.logger.log(
      `Starting mission for robot ${robotId} with ID: ${this.activeMissionId}`,
    );

    try {
      // Mettre à jour l'état du robot
      this.updateRobotState(robotId, 'en mission');
      await this.logsService.initializeMissionLog(this.activeMissionId);

      await this.logsService.addLog(this.activeMissionId, {
        type: 'COMMAND',
        robotId,
        data: {
          command: 'START_MISSION',
          timestamp: new Date().toISOString(),
        },
      });

      const missionPublisher = this.publishers.get(`${robotId}_mission`);
      if (missionPublisher) {
        const message = {
          data: JSON.stringify({
            action: 'start_mission',
            robot_id: robotId,
          }),
        };
        missionPublisher.publish(message);
        this.logger.log(
          `Message start_mission publié sur /${robotId}/messages`,
        );
      } else {
        this.logger.warn(`Publisher non trouvé pour ${robotId}`);
      }

      return { missionId: this.activeMissionId };
    } catch (error) {
      this.logger.error('Échec du démarrage de la mission', error);
      throw error;
    }
  }

  async stopMission(robotId: string) {
    const stoppedMissionId = this.activeMissionId;
    this.logger.log(
      `Stopping mission for robot ${robotId} with ID: ${stoppedMissionId}`,
    );

    if (!stoppedMissionId) {
      this.logger.warn(
        `Attempted to stop mission for robot ${robotId} but no active mission found`,
      );
      return { stoppedMissionId: null };
    }

    this.activeMissionId = null;

    try {
      // Mettre à jour l'état du robot
      this.updateRobotState(robotId, 'en arrêt');

      await this.logsService.addLog(stoppedMissionId, {
        type: 'COMMAND',
        robotId,
        data: {
          command: 'STOP_MISSION',
          timestamp: new Date().toISOString(),
        },
      });

      const missionPublisher = this.publishers.get(`${robotId}_mission`);
      if (missionPublisher) {
        const message = {
          data: JSON.stringify({
            action: 'end_mission',
            robot_id: robotId,
          }),
        };
        missionPublisher.publish(message);
        this.logger.log(`Message end_mission publié sur /${robotId}/messages`);
      }

      await this.logsService.finalizeMissionLog(stoppedMissionId);
      this.logger.debug('Mission log finalized');
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
    this.logger.log(`Envoi du signal d'identification pour ${robotId}`);
    const publisherKey = `${robotId}_identification`;
    const publisher = this.publishers.get(publisherKey);

    if (!publisher) {
      this.logger.error(
        `Aucun publisher d'identification trouvé pour ${robotId}`,
      );
      return {
        message: `Aucun publisher d'identification trouvé pour ${robotId}`,
      };
    }

    const message = {
      data: JSON.stringify({ action: 'identify', robot_id: robotId }),
    };
    publisher.publish(message);
    this.logger.log(`Message d'identification publié sur /${robotId}/messages`);
    return { message: `Signal d'identification envoyé pour ${robotId}` };
  }

  async updateRobotData(
    robotId: string,
    position: { x: number; y: number; z: number },
    distance: number,
  ) {
    if (!robotId || !this.activeMissionId) return;

    try {
      await this.logsService.addLog(this.activeMissionId, {
        type: 'SENSOR',
        robotId,
        data: {
          position,
          distance,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error('Error logging robot data:', error);
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
    this.logger.log('Démarrage de la mission pour tous les robots');
    const responses: string[] = [];
    this.activeMissionId = uuidv4();

    await this.logsService.initializeMissionLog(this.activeMissionId);

    for (const [key, publisher] of this.publishers.entries()) {
      if (key.endsWith('_mission')) {
        const robotId = key.split('_mission')[0];

        // Update robot state and add log entry
        this.updateRobotState(robotId, 'en mission');
        await this.logsService.addLog(this.activeMissionId, {
          type: 'COMMAND',
          robotId,
          data: {
            command: 'START_MISSION',
            timestamp: new Date().toISOString(),
          },
        });

        const message = {
          data: JSON.stringify({ action: 'start_mission', robot_id: robotId }),
        };
        publisher.publish(message);
        this.logger.log(
          `Message start_mission publié sur /${robotId}/messages`,
        );
        responses.push(`Mission démarrée pour ${robotId}`);
      }
    }

    return { message: responses.join(' | '), missionId: this.activeMissionId };
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
    this.logger.log('Arrêt de la mission pour tous les robots');
    const responses: string[] = [];

    if (this.activeMissionId) {
      for (const [key, publisher] of this.publishers.entries()) {
        if (key.endsWith('_mission')) {
          const robotId = key.split('_mission')[0];
          
          await this.logsService.addLog(this.activeMissionId, {
            type: 'COMMAND',
            robotId,
            data: {
              command: 'STOP_MISSION',
              timestamp: new Date().toISOString(),
            },
          });

          const message = {
            data: JSON.stringify({ action: 'end_mission', robot_id: robotId }),
          };
          publisher.publish(message);
          this.logger.log(`Message end_mission publié sur /${robotId}/messages`);
          responses.push(`Mission arrêtée pour ${robotId}`);
        }
      }

      await this.logsService.finalizeMissionLog(this.activeMissionId);
      this.activeMissionId = null;
    }

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

    if (this.activeMissionId) {
      await this.logsService.addLog(this.activeMissionId, {
        type: 'COMMAND',
        robotId,
        data: {
          command: 'RETURN_TO_BASE',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    this.updateRobotState(robotId, 'en arrêt');
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
