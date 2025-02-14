// Contrôleur temporairement désactivé
import { Controller } from '@nestjs/common';
// import { RobotSimulatorService } from './robot-simulator.service';

@Controller('simulator')
export class RobotSimulatorController {
    // constructor(private readonly simulatorService: RobotSimulatorService) {}

    // @Post('start')
    // startSimulation() {
    //     this.simulatorService.startSimulation();
    //     return { message: 'Simulation démarrée' };
    // }

    // @Post('stop')
    // stopSimulation() {
    //     this.simulatorService.stopSimulation();
    //     return { message: 'Simulation arrêtée' };
    // }

    // @Post('wheel-mode/:robotId')
    // setWheelMode(
    //     @Param('robotId') robotId: string,
    //     @Body() body: { mode: 'ackerman' | 'differential' }
    // ) {
    //     this.simulatorService.setRobotWheelMode(robotId, body.mode);
    //     return { message: `Mode de roues modifié pour le robot ${robotId}` };
    // }

    // @Post('mission/start')
    // startMission(@Body() body: { robotIds: string[] }) {
    //     this.simulatorService.startMission(body.robotIds);
    //     return { message: 'Mission démarrée' };
    // }

    // @Post('mission/stop')
    // stopMission(@Body() body: { robotIds: string[] }) {
    //     this.simulatorService.stopMission(body.robotIds);
    //     return { message: 'Mission arrêtée' };
    // }

    // @Post('mission/return')
    // returnToBase(@Body() body: { robotIds: string[] }) {
    //     this.simulatorService.returnToBase(body.robotIds);
    //     return { message: 'Retour à la base initié' };
    // }
}