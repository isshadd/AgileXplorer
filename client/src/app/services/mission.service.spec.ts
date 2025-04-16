import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MissionService } from './mission.service';
import { Mission, MapData, MissionLog } from '../models/mission.model';
import { environment } from '../../environments/environment';

describe('MissionService', () => {
  let service: MissionService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/missions`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MissionService]
    });
    service = TestBed.inject(MissionService);
    httpMock = TestBed.inject(HttpTestingController);

    // Remplacer setInterval pour éviter des appels répétés pendant les tests
    jasmine.clock().install();
  });

  afterEach(() => {
    httpMock.verify();
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadMissionHistory', () => {
    it('should load mission history', () => {
      const mockMissions: Mission[] = [
        {
          id: '1',
          robots: ['robot1', 'robot2'],
          startTime: '2025-01-01T00:00:00Z',
          endTime: '2025-01-01T00:30:00Z',
          status: 'completed',
          duration: 1800,
          totalDistance: 10,
          logs: []
        }
      ];

      service.loadMissionHistory().subscribe(missions => {
        expect(missions).toEqual(mockMissions);
      });

      const req = httpMock.expectOne(`${apiUrl}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMissions);
    });

    it('should apply filters when provided', () => {
      const filter = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-02'),
        robotId: 'robot1',
        status: 'completed'
      };

      service.loadMissionHistory(filter).subscribe();

      const req = httpMock.expectOne(request => {
        return request.url === apiUrl &&
          request.params.get('startDate') === filter.startDate.toISOString() &&
          request.params.get('endDate') === filter.endDate.toISOString() &&
          request.params.get('robotId') === filter.robotId &&
          request.params.get('status') === filter.status;
      });
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getMissionById', () => {
    it('should get a mission by ID', () => {
      const mockMission: Mission = {
        id: '1',
        robots: ['robot1'],
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-01T00:30:00Z',
        status: 'completed',
        duration: 1800,
        totalDistance: 5,
        logs: []
      };

      service.getMissionById('1').subscribe(mission => {
        expect(mission).toEqual(mockMission);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMission);
    });
  });

  describe('saveMap and loadMap', () => {
    it('should save a map', () => {
      const mockMapData: MapData = {
        timestamp: '2025-01-01T00:00:00Z',
        data: 'base64data'
      };

      service.saveMap('1', mockMapData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/1/map`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockMapData);
      req.flush({});
    });

    it('should load a map', () => {
      const mockMapData: MapData = {
        timestamp: '2025-01-01T00:00:00Z',
        data: 'base64data'
      };

      service.loadMap('1').subscribe(mapData => {
        expect(mapData).toEqual(mockMapData);
      });

      const req = httpMock.expectOne(`${apiUrl}/1/map`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMapData);
    });
  });

  describe('downloadLogs', () => {
    it('should download mission logs', () => {
      const mockLogs: MissionLog[] = [
        { timestamp: '2025-01-01T00:00:00Z', type: 'info', message: 'Mission started', robotId: 'robot1' },
        { timestamp: '2025-01-01T00:30:00Z', type: 'info', message: 'Mission completed', robotId: 'robot1' }
      ];

      service.downloadLogs('1').subscribe(logs => {
        expect(logs).toEqual(mockLogs);
      });

      const req = httpMock.expectOne(`${apiUrl}/1/logs`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLogs);
    });
  });

  describe('startNewMission and endCurrentMission', () => {
    it('should start a new mission', () => {
      const robots = ['robot1', 'robot2'];
      const mockMission: Mission = {
        id: '1',
        robots: robots,
        startTime: '2025-01-01T00:00:00Z',
        status: 'ongoing',
        totalDistance: 0,
        logs: []
      };

      service.startNewMission(robots).subscribe(mission => {
        expect(mission).toEqual(mockMission);
      });

      const req = httpMock.expectOne(`${apiUrl}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ robotIds: robots });
      req.flush(mockMission);
    });

    it('should end the current mission', () => {
      // Simuler une mission en cours
      const currentMission: Mission = {
        id: '1',
        robots: ['robot1'],
        startTime: '2025-01-01T00:00:00Z',
        status: 'ongoing',
        totalDistance: 0,
        logs: []
      };

      // Accéder au BehaviorSubject privé pour y injecter une valeur
      (service as any).currentMission$.next(currentMission);

      service.endCurrentMission().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/current/end`);
      expect(req.request.method).toBe('POST');
      req.flush({});

      // Vérifier que currentMission est remis à null
      service.getCurrentMission().subscribe(mission => {
        expect(mission).toBeNull();
      });
    });
  });
});