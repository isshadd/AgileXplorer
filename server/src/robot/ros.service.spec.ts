import { Test, TestingModule } from '@nestjs/testing';
import { RosService } from './ros.service';
import { MissionService } from '../mission/mission.service';
import { LogsService } from '../logs/logs.service';

// Mock pour rclnodejs
jest.mock('rclnodejs', () => {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    Node: jest.fn().mockImplementation(() => ({
      createPublisher: jest.fn().mockReturnValue({
        publish: jest.fn(),
      }),
      createSubscription: jest.fn().mockReturnValue({
        dispose: jest.fn(),
      }),
      destroy: jest.fn(),
      spin: jest.fn(),
    })),
  };
});

describe('RosService', () => {
  let service: RosService;
  let missionService: MissionService;
  let logsService: LogsService;
  
  // Mocks pour MissionService et LogsService
  const mockMissionService = {
    waitForInitialization: jest.fn().mockResolvedValue(undefined),
    getActiveMissionId: jest.fn().mockReturnValue('mission-123'),
  };
  
  const mockLogsService = {
    addLog: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    // Configuration du module de test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RosService,
        { provide: MissionService, useValue: mockMissionService },
        { provide: LogsService, useValue: mockLogsService },
      ],
    }).compile();

    service = module.get<RosService>(RosService);
    missionService = module.get<MissionService>(MissionService);
    logsService = module.get<LogsService>(LogsService);
    
    // Réinitialiser les mocks
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('devrait initialiser le node ROS 2', async () => {
      // Puisque onModuleInit est appelé automatiquement par NestJS,
      // on peut appeler manuellement pour tester
      await service.onModuleInit();
      
      expect(mockMissionService.waitForInitialization).toHaveBeenCalled();
      // Vérifier que le node est créé et configuré correctement
      // mais comme il s'agit d'une propriété privée, on ne peut pas y accéder directement
      // donc on vérifie simplement que la méthode s'exécute sans erreur
    });
    
    it('devrait gérer les erreurs d\'initialisation', async () => {
      // Simuler une erreur lors de l'initialisation
      mockMissionService.waitForInitialization.mockRejectedValueOnce(new Error('Erreur d\'initialisation'));
      
      // Capture les logs d'erreur
      const consoleSpy = jest.spyOn(service['logger'], 'error');
      
      await service.onModuleInit();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize ROS 2:',
        expect.any(Error)
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('devrait nettoyer les ressources ROS 2', async () => {
      // Pour tester onModuleDestroy, il faut d'abord initialiser le service
      // et configurer des abonnements
      await service.onModuleInit();
      
      // Puis appeler onModuleDestroy
      await service.onModuleDestroy();
      
      // Vérifier que rclnodejs.shutdown a été appelé
      const rclnodejs = require('rclnodejs');
      expect(rclnodejs.shutdown).toHaveBeenCalled();
    });
  });

  describe('publishP2PCommand', () => {
    it('devrait créer un publisher et publier une commande P2P', async () => {
      // Initialiser le service
      await service.onModuleInit();
      
      // Accéder au node ROS (propriété privée)
      const node = (service as any).node;
      const publisherSpy = jest.spyOn(node, 'createPublisher');
      
      // Appeler la méthode à tester
      service.publishP2PCommand('limo1', true);
      
      // Vérifier que le publisher a été créé avec les bons paramètres
      expect(publisherSpy).toHaveBeenCalledWith(
        'std_msgs/msg/Bool',
        '/limo1/p2p_command'
      );
      
      // Vérifier que le message a été publié
      const publisher = node.createPublisher();
      expect(publisher.publish).toHaveBeenCalledWith({ data: true });
    });
    
    it('devrait réutiliser un publisher existant', async () => {
      // Initialiser le service
      await service.onModuleInit();
      
      // Accéder au node ROS (propriété privée)
      const node = (service as any).node;
      const publisherSpy = jest.spyOn(node, 'createPublisher');
      
      // Appeler la méthode deux fois
      service.publishP2PCommand('limo1', true);
      service.publishP2PCommand('limo1', false);
      
      // Vérifier que le publisher n'a été créé qu'une seule fois
      expect(publisherSpy).toHaveBeenCalledTimes(1);
      
      // Vérifier que le dernier message a été publié
      const publisher = node.createPublisher();
      expect(publisher.publish).toHaveBeenLastCalledWith({ data: false });
    });
  });

  // Test des méthodes privées via un spy sur LogsService
  describe('Mises à jour des données robot', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });
    
    it('devrait journaliser la position du robot', () => {
      // Accéder à la méthode privée via l'objet service
      const updatePosition = (service as any).updateRobotPosition.bind(service);
      
      // Appeler la méthode privée
      const position = { x: 1.0, y: 2.0, z: 0.0 };
      updatePosition('limo1', position);
      
      // Vérifier que le log a été ajouté
      expect(logsService.addLog).toHaveBeenCalledWith('mission-123', {
        type: 'SENSOR',
        robotId: 'limo1',
        data: {
          position,
          timestamp: expect.any(String),
        },
      });
    });
    
    it('devrait journaliser la distance du robot', () => {
      // Accéder à la méthode privée
      const updateDistance = (service as any).updateRobotDistance.bind(service);
      
      // Appeler la méthode privée
      updateDistance('limo1', 0.5);
      
      // Vérifier que le log a été ajouté
      expect(logsService.addLog).toHaveBeenCalledWith('mission-123', {
        type: 'SENSOR',
        robotId: 'limo1',
        data: {
          distance: 0.5,
          timestamp: expect.any(String),
        },
      });
    });
    
    it('devrait journaliser le niveau de batterie du robot', () => {
      // Accéder à la méthode privée
      const updateBattery = (service as any).updateRobotBattery.bind(service);
      
      // Appeler la méthode privée
      updateBattery('limo1', 75);
      
      // Vérifier que le log a été ajouté
      expect(logsService.addLog).toHaveBeenCalledWith('mission-123', {
        type: 'SENSOR',
        robotId: 'limo1',
        data: {
          batteryLevel: 75,
          timestamp: expect.any(String),
        },
      });
    });
    
    it('ne devrait pas journaliser si aucune mission n\'est active', () => {
      // Simuler qu'aucune mission n'est active
      mockMissionService.getActiveMissionId.mockReturnValueOnce(null);
      
      // Accéder à la méthode privée
      const updateBattery = (service as any).updateRobotBattery.bind(service);
      
      // Appeler la méthode privée
      updateBattery('limo1', 75);
      
      // Vérifier que le log n'a pas été ajouté
      expect(logsService.addLog).not.toHaveBeenCalled();
    });
  });
});