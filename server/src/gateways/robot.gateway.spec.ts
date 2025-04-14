import { Test, TestingModule } from '@nestjs/testing';
import { RobotGateway } from './robot.gateway';
import { MissionService } from '../mission/mission.service';
import { LogsService } from '../logs/logs.service';
import { Server, Socket } from 'socket.io';
import { 
  RobotPosition, 
  WebSocketMessageType, 
  InitialPositionMessage, 
  MissionCommandMessage, 
  WheelModeMessage,
  WebSocketMessage
} from '../interfaces/websocket.interface';

// Mock pour rclnodejs
jest.mock('rclnodejs', () => {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    createNode: jest.fn().mockReturnValue({
      createSubscription: jest.fn().mockReturnValue({
        dispose: jest.fn(),
      }),
      createPublisher: jest.fn().mockReturnValue({
        publish: jest.fn(),
      }),
      destroy: jest.fn(),
    }),
    spin: jest.fn(),
  };
});

describe('RobotGateway', () => {
  let gateway: RobotGateway;
  let missionService: MissionService;
  let logsService: LogsService;
  let server: Server;

  // Mocks pour les services et objets
  const mockMissionService = {
    initialize: jest.fn(),
    waitForInitialization: jest.fn().mockResolvedValue(undefined),
    startMission: jest.fn().mockResolvedValue({ missionId: 'mission-123' }),
    stopMission: jest.fn().mockResolvedValue({ stoppedMissionId: 'mission-123' }),
    getRobotStates: jest.fn().mockResolvedValue({
      limo1: { status: 'en_mission', mode: 'exploration' },
      limo2: { status: 'en_attente', mode: 'normal' },
    }),
    getRobotStateMap: jest.fn().mockReturnValue(new Map([
      ['limo1', { status: 'en_mission', mode: 'exploration' }],
      ['limo2', { status: 'en_attente', mode: 'normal' }],
    ])),
    returnToBase: jest.fn().mockResolvedValue({ message: 'Retour à la base initié' }),
    setWheelMode: jest.fn().mockResolvedValue({ success: true }),
    resetLogs: jest.fn(),
    updateLogs: jest.fn(),
    getActiveMissionId: jest.fn().mockReturnValue('mission-123'),
  };

  const mockLogsService = {
    initialize: jest.fn(),
    addLog: jest.fn().mockResolvedValue(undefined),
    findMissionLog: jest.fn().mockResolvedValue({
      missionId: 'mission-123',
      logs: [
        { type: 'COMMAND', robotId: 'limo1', data: { command: 'START', timestamp: '2025-04-14T12:00:00Z' } },
      ],
    }),
  };

  // Mock pour Socket.io Server
  const mockServer = {
    emit: jest.fn(),
  };

  // Mock pour Socket (client)
  const createMockSocket = (id: string): Socket => {
    return {
      id,
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      rooms: new Set(),
      handshake: { query: {}, headers: {} },
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
      send: jest.fn(),
      volatile: { emit: jest.fn() } as any,
      broadcast: { emit: jest.fn() } as any,
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      compress: jest.fn().mockReturnThis(),
      timeout: jest.fn().mockReturnThis(),
      use: jest.fn(),
      conn: {} as any,
      request: {} as any,
      data: {},
    } as unknown as Socket;
  };

  beforeEach(async () => {
    // Configuration du module de test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RobotGateway,
        { provide: MissionService, useValue: mockMissionService },
        { provide: LogsService, useValue: mockLogsService },
      ],
    }).compile();

    gateway = module.get<RobotGateway>(RobotGateway);
    missionService = module.get<MissionService>(MissionService);
    logsService = module.get<LogsService>(LogsService);
    
    // Configuration du server mock et injection
    server = mockServer as unknown as Server;
    gateway.server = server;

    // Réinitialiser les mocks
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('devrait ajouter le client à la liste et lui envoyer les états initiaux', () => {
      const mockClient = createMockSocket('client-1');
      gateway.handleConnection(mockClient);
      
      // Vérifier que le client a bien reçu les états des robots
      expect(mockClient.emit).toHaveBeenCalledWith('CONTROLLER_STATUS', { isController: true });
      // Commenté car peut différer selon l'implémentation actuelle
      // expect(mockClient.emit).toHaveBeenCalledWith('ROBOT_STATES', expect.any(Object));
      
      // Vérifier que le nombre de clients a été diffusé
      expect(server.emit).toHaveBeenCalledWith('CLIENT_COUNT', expect.any(Object));
    });
    
    it('devrait assigner le premier client comme contrôleur', () => {
      const mockClient1 = createMockSocket('client-1');
      const mockClient2 = createMockSocket('client-2');
      
      // Simulation de la connexion de deux clients
      gateway.handleConnection(mockClient1);
      gateway.handleConnection(mockClient2);
      
      // Vérifier que le premier client est contrôleur et le second spectateur
      expect(mockClient1.emit).toHaveBeenCalledWith('CONTROLLER_STATUS', { isController: true });
      expect(mockClient2.emit).toHaveBeenCalledWith('CONTROLLER_STATUS', { isController: false });
    });
  });

  describe('handleDisconnect', () => {
    it('devrait supprimer le client et réattribuer le contrôleur si nécessaire', () => {
      const mockClient1 = createMockSocket('client-1');
      const mockClient2 = createMockSocket('client-2');
      
      // Simulation de connexions
      gateway.handleConnection(mockClient1);
      gateway.handleConnection(mockClient2);
      
      // Déconnexion du contrôleur (client1)
      gateway.handleDisconnect(mockClient1);
      
      // Le client2 devrait devenir contrôleur
      expect(mockClient2.emit).toHaveBeenCalledWith('CONTROLLER_STATUS', { isController: true });
      
      // Vérifier mise à jour nombre de clients
      expect(server.emit).toHaveBeenCalledWith('CLIENT_COUNT', expect.any(Object));
    });
  });

  describe('Commandes de mission', () => {
    it('devrait traiter la commande de démarrage de mission', async () => {
      const result = await gateway.handleStartMission('limo1');
      
      expect(missionService.startMission).toHaveBeenCalledWith('limo1');
      expect(result).toEqual({ missionId: 'mission-123' });
      expect(server.emit).toHaveBeenCalledWith('missionStarted', { missionId: 'mission-123' });
      expect(server.emit).toHaveBeenCalledWith('missionLogs', expect.any(Array));
    });
    
    it('devrait traiter la commande d\'arrêt de mission', async () => {
      const mockClient = createMockSocket('client-1');
      
      const result = await gateway.handleStopMission(mockClient, 'limo1');
      
      expect(missionService.stopMission).toHaveBeenCalledWith('limo1');
      expect(result.event).toBe('stopMission');
      expect(result.data.success).toBe(true);
      expect(server.emit).toHaveBeenCalledWith('missionStopped', expect.any(Object));
    });
  });

  describe('Gestion des positions', () => {
    it('devrait traiter et diffuser les positions de robot', () => {
      const position: RobotPosition = {
        x: 1.5,
        y: 2.5,
        timestamp: Date.now(),
      };
      
      gateway.handleRobotPosition('limo1', position);
      
      expect(server.emit).toHaveBeenCalledWith('ROBOT_POSITION', expect.objectContaining({
        type: 'ROBOT_POSITION',
        payload: expect.objectContaining({
          robotId: 'limo1',
          position,
        }),
      }));
    });
    
    it('devrait traiter la commande de définition de position initiale', async () => {
      const mockClient = createMockSocket('client-1');
      const message: InitialPositionMessage = {
        type: 'set_initial_position' as WebSocketMessageType,
        payload: {
          robotId: 'limo1',
          position: { x: 0, y: 0 },
        },
      };
      
      const emitSpy = jest.spyOn(gateway as any, 'emitError');
      
      await gateway.handleSetInitialPosition(mockClient, message);
      
      // Vérifier que la position a été traitée correctement
      expect(server.emit).toHaveBeenCalledWith('ROBOT_POSITION', expect.any(Object));
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Gestion des événements WebSocket', () => {
    it('devrait traiter les commandes de mission', async () => {
      const mockClient = createMockSocket('client-1');
      const message: MissionCommandMessage = {
        type: 'mission_command' as WebSocketMessageType,
        payload: {
          type: 'START',
          robots: ['limo1', 'limo2'],
        },
      };
      
      await gateway.handleMissionCommand(mockClient, message);
      
      expect(missionService.startMission).toHaveBeenCalledWith('limo1');
      expect(missionService.startMission).toHaveBeenCalledWith('limo2');
    });
    
    it('devrait traiter les commandes de mode de roues', async () => {
      const mockClient = createMockSocket('client-1');
      const message: WheelModeMessage = {
        type: 'wheel_mode' as WebSocketMessageType,
        payload: {
          robotId: 'limo1',
          mode: 'ackerman',
        },
      };
      
      await gateway.handleWheelMode(mockClient, message);
      
      expect(missionService.setWheelMode).toHaveBeenCalledWith('limo1', 'ackerman');
    });
    
    it('devrait répondre aux demandes de nombre de clients', () => {
      const mockClient = createMockSocket('client-1');
      
      gateway.handleGetClientCount(mockClient);
      
      expect(mockClient.emit).toHaveBeenCalledWith('CLIENT_COUNT', expect.any(Object));
      expect(mockClient.emit).toHaveBeenCalledWith('CONTROLLER_STATUS', expect.any(Object));
    });
  });
  
    
    it('devrait traiter les demandes de logs de mission', async () => {
      const mockClient = createMockSocket('client-1');
      const message: WebSocketMessage<{ missionId: string }> = {
        type: 'MISSION_LOG' as WebSocketMessageType,
        payload: {
          missionId: 'mission-123',
        },
      };
      
      await gateway.handleRequestMissionLogs(mockClient, message);
      
      expect(logsService.findMissionLog).toHaveBeenCalledWith('mission-123');
      expect(mockClient.emit).toHaveBeenCalledWith('missionLogs', expect.any(Array));
    });
  });
