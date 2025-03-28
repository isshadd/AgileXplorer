export interface Log {
  timestamp: Date;
  missionId: string;
  robotId: string;
  type: 'SENSOR' | 'COMMAND';
  data: {
    position?: { x: number; y: number; z: number };
    distance?: number;
    command?: string;
    [key: string]: any;
  };
}