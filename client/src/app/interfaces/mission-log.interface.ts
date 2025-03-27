export interface MissionLog {
  type: 'COMMAND' | 'SENSOR';
  robotId: string;
  data: {
    command?: string;
    timestamp: string;
    position?: {
      x: number;
      y: number;
      z: number;
    };
    distance?: number;
  };
}