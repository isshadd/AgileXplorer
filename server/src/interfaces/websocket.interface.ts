export enum WebSocketEvent {
  START_MISSION = 'startMission',
  STOP_MISSION = 'stopMission',
  MISSION_STARTED = 'missionStarted',
  MISSION_STOPPED = 'missionStopped',
  MISSION_UPDATE = 'missionUpdate'
}

export interface MissionStatus {
  missionId?: string;
  status: 'running' | 'stopped' | 'completed';
  timestamp: Date;
}