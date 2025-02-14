import { Module } from '@nestjs/common';
import { RobotController } from '../controllers/robot.controller';
import { RobotSimulatorService } from '../robot-simulator/robot-simulator.service';
import { RobotSimulatorModule } from '../robot-simulator/robot-simulator.module';

@Module({
    imports: [RobotSimulatorModule],
    controllers: [RobotController],
    providers: [],
    exports: []
})
export class RobotModule {}