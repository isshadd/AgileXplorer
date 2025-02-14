// WebSocket interfaces temporarily disabled

// export interface WebSocketMessage<T = any> {
//     type: string;
//     payload: T;
// }

// export interface MissionCommandMessage extends WebSocketMessage {
//     type: 'MISSION_COMMAND';
//     payload: {
//         type: 'START' | 'STOP' | 'RETURN';
//         robots: string[];
//     };
// }

// export interface P2PCommandMessage extends WebSocketMessage {
//     type: 'P2P_COMMAND';
//     payload: {
//         type: 'ENABLE' | 'DISABLE';
//         robots: string[];
//     };
// }

// export interface WheelModeMessage extends WebSocketMessage {
//     type: 'WHEEL_MODE';
//     payload: {
//         robotId: string;
//         mode: 'ackerman' | 'differential';
//     };
// }

// export interface RobotStatesMessage extends WebSocketMessage {
//     type: 'ROBOT_STATES';
//     payload: {
//         states: any[];
//     };
// }

// export interface MissionLogMessage extends WebSocketMessage {
//     type: 'MISSION_LOG';
//     payload: {
//         log: any;
//     };
// }

// export interface ErrorMessage extends WebSocketMessage {
//     type: 'error';
//     payload: {
//         message: string;
//         code: string;
//     };
// }