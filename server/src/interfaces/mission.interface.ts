export interface MapData {
    timestamp: string;
    data: string; // Base64 encoded map data or JSON string
}

export interface MissionLog {
    timestamp: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    robotId?: string;
}

export interface Mission {
    id: string;
    startTime: string;
    endTime?: string;
    status: 'ongoing' | 'completed' | 'aborted';
    robots: string[]; // array of robot IDs
    logs: MissionLog[];
}

export interface MissionFilter {
    startDate?: Date;
    endDate?: Date;
    robotId?: string;
    status?: string;
}