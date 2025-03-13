import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MissionService } from '../mission/mission.service';
import { WebSocketEvent } from '../interfaces/websocket.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RobotGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly missionService: MissionService) {}

  @SubscribeMessage('startMission')
  handleStartMission() {
    const result = this.missionService.startMission();
    this.server.emit('missionStarted', result);
    return result;
  }

  @SubscribeMessage('stopMission')
  handleStopMission() {
    const result = this.missionService.stopMission();
    this.server.emit('missionStopped', result);
    return result;
  }

  emitMissionUpdate(data: any) {
    this.server.emit('missionUpdate', data);
  }
}