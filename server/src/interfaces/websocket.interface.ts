export type WebSocketMessageType =
  | 'mission_command'
  | 'wheel_mode'
  | 'p2p_command'
  | 'ROBOT_STATES'
  | 'MISSION_LOG'
  | 'ROBOT_POSITION'
  | 'set_initial_position'
  | 'MAP_DATA'
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

export interface InitialPositionPayload {
  robotId: string;
  position: {
    x: number;
    y: number;
  };
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

export interface MapDataPayload {
  resolution: number;     // Taille d'une cellule en mètres
  width: number;          // Largeur de la carte en cellules
  height: number;         // Hauteur de la carte en cellules
  origin: {               // Position de l'origine de la carte
    x: number;
    y: number;
    z: number;
    orientation: {
      x: number;
      y: number;
      z: number;
      w: number;
    }
  };
  data: number[];         // Données d'occupation (-1, 0-100)
}

export type MissionCommandMessage = WebSocketMessage<MissionCommandPayload>;
export type WheelModeMessage = WebSocketMessage<WheelModePayload>;
export type RobotStatesMessage = WebSocketMessage<RobotStatesPayload>;
export type RobotPositionMessage = WebSocketMessage<RobotPositionPayload>;
export type MissionLogMessage = WebSocketMessage<MissionLogPayload>;
export type InitialPositionMessage = WebSocketMessage<InitialPositionPayload>;
export type MapDataMessage = WebSocketMessage<MapDataPayload>;
export type ErrorMessage = WebSocketMessage<ErrorPayload>;
