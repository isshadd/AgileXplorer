import { Test, TestingModule } from '@nestjs/testing';
import { RobotController } from './robot.controller';
import { MissionService } from '../mission/mission.service';
import { RosService } from '../robot/ros.service';

describe('RobotController', () => {
  let controller: RobotController;
  let missionService: MissionService;
  let rosService: RosService;

  // Créer des mocks pour MissionService et RosService
  const mockMissionService = {
    startMission: jest.fn(),
    stopMission: jest.fn(),
    getMissionLogs: jest.fn(),
    returnToBase: jest.fn(),
    identify: jest.fn(),
    getActiveMissionId: jest.fn(),
  };

  const mockRosService = {
    publishP2PCommand: jest.fn(),
  };

  beforeEach(async () => {
    // Configuration du module de test
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RobotController],
      providers: [
        { provide: MissionService, useValue: mockMissionService },
        { provide: RosService, useValue: mockRosService },
      ],
    }).compile();

    controller = module.get<RobotController>(RobotController);
    missionService = module.get<MissionService>(MissionService);
    rosService = module.get<RosService>(RosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('startMission', () => {
    it('devrait démarrer une mission pour un robot spécifique', async () => {
      const robotId = 'limo1';
      const expectedResult = { missionId: 'mission123' };
      
      mockMissionService.startMission.mockResolvedValue(expectedResult);
      
      const result = await controller.startMission(robotId);
      
      expect(missionService.startMission).toHaveBeenCalledWith(robotId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('stopMission', () => {
    it('devrait arrêter une mission pour un robot spécifique', async () => {
      const robotId = 'limo1';
      const expectedResult = { stoppedMissionId: 'mission123' };
      
      mockMissionService.stopMission.mockResolvedValue(expectedResult);
      
      const result = await controller.stopMission(robotId);
      
      expect(missionService.stopMission).toHaveBeenCalledWith(robotId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMissionLogs', () => {
    it('devrait récupérer les logs d\'une mission spécifique', async () => {
      const missionId = 'mission123';
      const expectedLogs = [
        { timestamp: '2025-04-14T12:00:00Z', message: 'Mission started', type: 'info' },
        { timestamp: '2025-04-14T12:05:00Z', message: 'Obstacle detected', type: 'warning' },
      ];
      
      mockMissionService.getMissionLogs.mockResolvedValue(expectedLogs);
      
      const result = await controller.getMissionLogs(missionId);
      
      expect(missionService.getMissionLogs).toHaveBeenCalledWith(missionId);
      expect(result).toEqual(expectedLogs);
    });
  });

  describe('returnToBase', () => {
    it('devrait ordonner à un robot de retourner à sa base', async () => {
      const robotId = 'limo1';
      const expectedResult = { message: 'Retour à la base initié' };
      
      mockMissionService.returnToBase.mockResolvedValue(expectedResult);
      
      const result = await controller.returnToBase(robotId);
      
      expect(missionService.returnToBase).toHaveBeenCalledWith(robotId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('identify', () => {
    it('devrait ordonner à un robot de s\'identifier', async () => {
      const robotId = 'limo1';
      const expectedResult = { message: 'Identification initiée' };
      
      mockMissionService.identify.mockResolvedValue(expectedResult);
      
      const result = await controller.identify(robotId);
      
      expect(missionService.identify).toHaveBeenCalledWith(robotId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getActiveMission', () => {
    it('devrait récupérer l\'ID de la mission active', () => {
      const expectedMissionId = 'mission123';
      
      mockMissionService.getActiveMissionId.mockReturnValue(expectedMissionId);
      
      const result = controller.getActiveMission();
      
      expect(missionService.getActiveMissionId).toHaveBeenCalled();
      expect(result).toEqual({ missionId: expectedMissionId });
    });
  });

  describe('toggleP2P', () => {
    it('devrait activer le mode P2P pour un robot', async () => {
      const robotId = 'limo1';
      const body = { enable: true };
      const expectedResult = { message: 'Mode P2P activé pour limo1' };
      
      const result = await controller.toggleP2P(robotId, body);
      
      expect(rosService.publishP2PCommand).toHaveBeenCalledWith(robotId, true);
      expect(result).toEqual(expectedResult);
    });

    it('devrait désactiver le mode P2P pour un robot', async () => {
      const robotId = 'limo1';
      const body = { enable: false };
      const expectedResult = { message: 'Mode P2P désactivé pour limo1' };
      
      const result = await controller.toggleP2P(robotId, body);
      
      expect(rosService.publishP2PCommand).toHaveBeenCalledWith(robotId, false);
      expect(result).toEqual(expectedResult);
    });
  });
});
