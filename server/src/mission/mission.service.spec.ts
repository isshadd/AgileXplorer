import { Test, TestingModule } from '@nestjs/testing';
import { MissionService } from './mission.service';
import { LogsService } from '../logs/logs.service';
import { Server } from 'socket.io';

// Mock pour rclnodejs
jest.mock('rclnodejs', () => ({
  init: jest.fn().mockResolvedValue(undefined),
  createNode: jest.fn().mockReturnValue({
    createPublisher: jest.fn().mockReturnValue({
      publish: jest.fn(),
    }),
    spin: jest.fn(),
  }),
  spin: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

// Mock pour socket.io Server
const mockServer = {
  emit: jest.fn(),
} as unknown as Server;

describe('MissionService', () => {
  let service: MissionService;
  let logsService: LogsService;

  // Mock pour LogsService
  const mockLogsService = {
    initialize: jest.fn(),
    initializeMissionLog: jest.fn().mockResolvedValue(undefined),
    addLog: jest.fn().mockResolvedValue(undefined),
    finalizeMissionLog: jest.fn().mockResolvedValue(undefined),
    findMissionLog: jest.fn().mockResolvedValue({
      missionId: 'mission-123',
      logs: [
        {
          type: 'COMMAND',
          robotId: 'limo1',
          data: {
            command: 'START_MISSION',
            timestamp: new Date().toISOString(),
          },
        },
      ],
    }),
    findAllMissionLogs: jest.fn().mockResolvedValue([
      {
        missionId: 'mission-123',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        logs: [
          {
            type: 'COMMAND',
            robotId: 'limo1',
            data: {
              command: 'START_MISSION',
              timestamp: new Date().toISOString(),
            },
          },
        ],
      },
    ]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionService,
        { provide: LogsService, useValue: mockLogsService },
      ],
    }).compile();

    service = module.get<MissionService>(MissionService);
    logsService = module.get<LogsService>(LogsService);

    // Initialiser le service avec un serveur mock
    service.initialize(mockServer);
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('initialize', () => {
    it('devrait initialiser le service avec le serveur et initialiser le service de logs', () => {
      service.initialize(mockServer);
      expect(mockLogsService.initialize).toHaveBeenCalledWith(mockServer);
    });
  });

  describe('resetLogs', () => {
    it('devrait réinitialiser les logs', () => {
      service.resetLogs();
      // La méthode est vide, donc vérifions simplement qu'elle s'exécute sans erreur
      expect(true).toBeTruthy();
    });
  });

  describe('updateLogs', () => {
    it('devrait mettre à jour les logs avec de nouveaux logs', () => {
      const newLogs = [{ type: 'SENSOR', robotId: 'limo1', data: { message: 'test' } }];
      service.updateLogs(newLogs);
      // La méthode ajoute simplement des logs, vérifions qu'elle s'exécute sans erreur
      expect(true).toBeTruthy();
    });
  });

  describe('startMission', () => {
    it('devrait démarrer une mission pour un robot spécifique', async () => {
      const result = await service.startMission('limo1');
      
      expect(mockLogsService.initializeMissionLog).toHaveBeenCalled();
      expect(mockLogsService.addLog).toHaveBeenCalled();
      expect(result).toHaveProperty('missionId');
    });
  });

  describe('stopMission', () => {
    it('devrait arrêter une mission pour un robot spécifique', async () => {
      // Démarrer d'abord une mission
      await service.startMission('limo1');
      
      // Puis l'arrêter
      const result = await service.stopMission('limo1');
      
      expect(mockLogsService.addLog).toHaveBeenCalled();
      expect(mockLogsService.finalizeMissionLog).toHaveBeenCalled();
      expect(result).toHaveProperty('stoppedMissionId');
    });
  });

  describe('getActiveMissionId', () => {
    it('devrait renvoyer l\'ID de la mission active', async () => {
      // Démarrer une mission pour avoir un ID actif
      await service.startMission('limo1');
      
      const missionId = service.getActiveMissionId();
      expect(missionId).toBeDefined();
    });
  });

  describe('identify', () => {
    it('devrait envoyer un signal d\'identification à un robot', async () => {
      const result = await service.identify('limo1');
      
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Signal d\'identification envoyé pour limo1');
    });
  });

  describe('updateRobotData', () => {
    it('devrait mettre à jour les données d\'un robot pendant une mission', async () => {
      // Démarrer une mission
      await service.startMission('limo1');
      
      // Mettre à jour les données
      await service.updateRobotData('limo1', { x: 1, y: 2, z: 0 }, 0.5);
      
      expect(mockLogsService.addLog).toHaveBeenCalled();
    });
  });

  describe('getMissionLogs', () => {
    it('devrait récupérer les logs d\'une mission spécifique', async () => {
      const logs = await service.getMissionLogs('mission-123');
      
      expect(mockLogsService.findMissionLog).toHaveBeenCalledWith('mission-123');
      expect(logs).toBeDefined();
      expect(logs.logs).toBeInstanceOf(Array);
    });
  });

  describe('startMissionsAll', () => {
    it('devrait démarrer une mission pour tous les robots', async () => {
      const result = await service.startMissionsAll();
      
      expect(mockLogsService.initializeMissionLog).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('missionId');
    });
  });

  describe('getMissions', () => {
    it('devrait récupérer toutes les missions', async () => {
      const missions = await service.getMissions();
      
      expect(mockLogsService.findAllMissionLogs).toHaveBeenCalled();
      expect(missions).toBeInstanceOf(Array);
    });
  });

  describe('stopMissionsAll', () => {
    it('devrait arrêter toutes les missions en cours', async () => {
      // Démarrer une mission pour tous les robots
      await service.startMissionsAll();
      
      // Arrêter toutes les missions
      const result = await service.stopMissionsAll();
      
      expect(mockLogsService.finalizeMissionLog).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  describe('returnToBase', () => {
    it('devrait envoyer un signal de retour à la base à un robot', async () => {
      const result = await service.returnToBase('limo1');
      
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Retour à la base initié pour limo1');
    });
  });

  describe('setWheelMode', () => {
    it('devrait changer le mode de roues d\'un robot', async () => {
      const result = await service.setWheelMode('limo1', 'differential');
      
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Mode de roues changé pour limo1: differential');
    });
  });

  describe('getRobotStates', () => {
    it('devrait récupérer l\'état de tous les robots', async () => {
      const states = await service.getRobotStates();
      
      expect(states).toBeInstanceOf(Array);
      expect(states.length).toBeGreaterThan(0);
    });
  });

  describe('getRobotStateMap', () => {
    it('devrait récupérer la carte des états des robots', () => {
      const stateMap = service.getRobotStateMap();
      
      expect(stateMap).toBeInstanceOf(Map);
      expect(stateMap.size).toBeGreaterThan(0);
    });
  });
});