export type WebSocketMessageType =
  | 'mission_command'
  | 'wheel_mode'
  | 'p2p_command'
  | 'ROBOT_STATES'
  | 'MISSION_LOG'
  | 'ROBOT_POSITION'
  | 'error';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
}

export interface MissionCommandPayload {
  type: 'START' | 'STOP' | 'RETURN';
  robots: string[];
}

export interface WheelModePayload {
  robotId: string;
  mode: 'ackerman' | 'differential';
}

export interface RobotPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface RobotPositionPayload {
  robotId: string;
  position: RobotPosition;
  speed: number;
  angular: number;
  battery: number;
}

export interface RobotStatesPayload {
  states: any[];
}

export interface MissionLogPayload {
  log: any;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

export type MissionCommandMessage = WebSocketMessage<MissionCommandPayload>;
export type WheelModeMessage = WebSocketMessage<WheelModePayload>;
export type RobotStatesMessage = WebSocketMessage<RobotStatesPayload>;
export type RobotPositionMessage = WebSocketMessage<RobotPositionPayload>;
export type MissionLogMessage = WebSocketMessage<MissionLogPayload>;
export type ErrorMessage = WebSocketMessage<ErrorPayload>;
