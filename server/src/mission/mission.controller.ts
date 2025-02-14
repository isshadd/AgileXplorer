// import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
// import { MissionService } from './mission.service';
// import { RobotState } from '../interfaces/robot.interface';
// import { Mission } from '../interfaces/mission.interface';

// @Controller('missions')
// export class MissionController {
//     constructor(private readonly missionService: MissionService) {}

//     @Get()
//     async getMissions(
//         @Query('startDate') startDate?: string,
//         @Query('endDate') endDate?: string,
//         @Query('robotId') robotId?: string,
//         @Query('status') status?: string
//     ): Promise<Mission[]> {
//         return this.missionService.getMissions();
//     }

//     @Get('current')
//     async getCurrentMission(): Promise<Mission | null> {
//         const missions = await this.missionService.getMissions();
//         return missions.find(m => m.status === 'ongoing') || null;
//     }

//     @Get(':id')
//     async getMissionById(@Param('id') id: string): Promise<Mission> {
//         const missions = await this.missionService.getMissions();
//         const mission = missions.find(m => m.id === id);
//         if (!mission) {
//             throw new Error('Mission not found');
//         }
//         return mission;
//     }

//     @Get(':id/logs')
//     async getMissionLogs(@Param('id') id: string): Promise<any[]> {
//         const mission = await this.getMissionById(id);
//         return mission.logs || [];
//     }

//     @Get(':id/map')
//     async getMissionMap(@Param('id') id: string): Promise<any> {
//         // Pour l'instant, retourne une carte vide
//         return {};
//     }

//     @Post()
//     async startMission(@Body() data: { robotIds: string[] }): Promise<Mission> {
//         return this.missionService.startMission(data.robotIds);
//     }

//     @Post('current/end')
//     async endCurrentMission(): Promise<void> {
//         const missions = await this.missionService.getMissions();
//         const currentMission = missions.find(m => m.status === 'ongoing');
//         if (currentMission) {
//             await this.missionService.stopMission(currentMission.robots);
//         }
//     }

//     @Post(':id/map')
//     async saveMap(
//         @Param('id') id: string,
//         @Body() mapData: any
//     ): Promise<void> {
//         // Pour l'instant, ne fait rien
//         return;
//     }

//     @Get('status')
//     async getMissionStatus(): Promise<{ robots: RobotState[]; activeMission: boolean }> {
//         const missions = await this.missionService.getMissions();
//         const activeMission = missions.some(m => m.status === 'ongoing');
//         return {
//             robots: [],  // Pour l'instant, retourne un tableau vide
//             activeMission
//         };
//     }
// }