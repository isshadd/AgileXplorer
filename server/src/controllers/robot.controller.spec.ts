import { Test, TestingModule } from '@nestjs/testing';
import { RobotController } from './robot.controller';
import { MissionService } from '../mission/mission.service';

describe('RobotController', () => {
  let controller: RobotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RobotController],
      providers: [
        {
          provide: MissionService,
          useValue: {
            startMission: jest
              .fn()
              .mockResolvedValue({ message: 'Mission démarrée' }),
            stopMission: jest
              .fn()
              .mockResolvedValue({ message: 'Mission arrêtée' }),
            getMissionLogs: jest.fn().mockResolvedValue([]),
            returnToBase: jest
              .fn()
              .mockResolvedValue({ message: 'Retour à la base' }),
            identify: jest
              .fn()
              .mockResolvedValue({ message: 'Robot identifié' }),
            getActiveMissionId: jest.fn().mockReturnValue('mission-123'),
          },
        },
      ],
    }).compile();

    controller = module.get<RobotController>(RobotController);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  it('devrait démarrer une mission', async () => {
    const result = await controller.startMission('robot1');
    expect(result).toEqual({ message: 'Mission démarrée' });
  });

  it('devrait arrêter une mission', async () => {
    const result = await controller.stopMission('robot1');
    expect(result).toEqual({ message: 'Mission arrêtée' });
  });

  it("devrait retourner les logs d'une mission", async () => {
    const result = await controller.getMissionLogs('mission-123');
    expect(result).toEqual([]);
  });

  it('devrait demander le retour à la base', async () => {
    const result = await controller.returnToBase('robot1');
    expect(result).toEqual({ message: 'Retour à la base' });
  });

  it('devrait identifier un robot', async () => {
    const result = await controller.identify('robot1');
    expect(result).toEqual({ message: 'Robot identifié' });
  });

  it("devrait retourner l'ID de la mission active", () => {
    const result = controller.getActiveMission();
    expect(result).toEqual({ missionId: 'mission-123' });
  });
});
