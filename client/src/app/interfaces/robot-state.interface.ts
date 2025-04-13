export interface RobotState {
    isMissionActive: boolean;
    isIdentified: boolean;
    battery_level?: number;
    isP2PActive?: boolean;
}