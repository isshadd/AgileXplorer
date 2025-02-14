export interface RobotState {
    id: string;
    name: string;
    status: 'idle' | 'on_mission' | 'returning' | 'charging' | 'error';
    batteryLevel: number;
    position: {
        x: number;
        y: number;
        z?: number;
    };
    wheelMode: {
        type: 'ackerman' | 'differential'
    };
    isFarthest?: boolean;
    p2pEnabled?: boolean;
}

export interface Robot {
    id: string;
    name: string;
    state: RobotState;
}

export type WheelMode = 'ackerman' | 'differential';