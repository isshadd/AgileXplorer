import { Log } from './log.interface';

export interface WebSocketMessage<T> {
  type: string;
  payload: T;
}

export interface RobotStatesMessage extends WebSocketMessage<{
  [robotId: string]: {
    isIdentified: boolean;
    isMissionActive: boolean;
  };
}> {}

export interface MissionLogMessage extends WebSocketMessage<Log> {}

export interface ErrorMessage extends WebSocketMessage<{
  message: string;
  code?: string;
}> {}