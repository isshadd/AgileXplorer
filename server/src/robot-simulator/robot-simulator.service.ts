import { Injectable } from '@nestjs/common';
import { MissionService } from '../mission/mission.service';
import { RobotState } from '../interfaces/robot.interface';

@Injectable()
export class RobotSimulatorService {
    constructor(private missionService: MissionService) {}

    async getRobotStates(): Promise<RobotState[]> {
        return [];
    }

    async startMission(robotIds: string[]): Promise<void> {
        // No-op
    }

    async stopMission(robotIds: string[]): Promise<void> {
        // No-op
    }

    async returnToBase(robotIds: string[]): Promise<void> {
        // No-op
    }

    async setWheelMode(robotId: string, mode: 'ackerman' | 'differential'): Promise<void> {
        // No-op
    }
}