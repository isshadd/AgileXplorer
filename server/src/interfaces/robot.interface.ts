export interface RobotState {
    id: string;
    batteryLevel: number;
    position: Position;
    status: RobotStatus;
    wheelMode: WheelMode;
}

export interface Position {
    x: number;
    y: number;
    z?: number;
}

export type RobotStatus = 'idle' | 'on_mission' | 'returning' | 'charging' | 'error';

export interface WheelMode {
    type: 'ackerman' | 'differential';
}