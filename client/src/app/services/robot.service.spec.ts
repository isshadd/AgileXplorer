import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RobotService } from './robot.service';
import { environment } from '../../environments/environment';

describe('RobotService', () => {
  let service: RobotService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/robot`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RobotService]
    });
    service = TestBed.inject(RobotService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  describe('startMission', () => {
    it('devrait envoyer une requête POST pour démarrer une mission', () => {
      const robotId = 'limo1';
      const mockResponse = { missionId: 'mission-123' };

      service.startMission(robotId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/${robotId}/mission/start`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('stopMission', () => {
    it('devrait envoyer une requête POST pour arrêter une mission', () => {
      const robotId = 'limo1';
      const mockResponse = { stoppedMissionId: 'mission-123' };

      service.stopMission(robotId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/${robotId}/mission/stop`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('identify', () => {
    it('devrait envoyer une requête POST pour identifier un robot', () => {
      const robotId = 'limo1';

      service.identify(robotId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${robotId}/identify`);
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('returnToBase', () => {
    it('devrait envoyer une requête POST pour faire revenir un robot à sa base', () => {
      const robotId = 'limo1';

      service.returnToBase(robotId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${robotId}/mission/return`);
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('startAllMissions', () => {
    it('devrait envoyer une requête POST pour démarrer toutes les missions', () => {
      service.startAllMissions().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/mission/start_all`);
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('stopAllMissions', () => {
    it('devrait envoyer une requête POST pour arrêter toutes les missions', () => {
      service.stopAllMissions().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/mission/stop_all`);
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('toggleP2P', () => {
    it('devrait envoyer une requête POST pour activer le mode P2P', () => {
      const robotId = 'limo1';
      const enable = true;
      const mockResponse = { message: 'P2P activé' };

      service.toggleP2P(robotId, enable).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/${robotId}/p2p`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ enable });
      req.flush(mockResponse);
    });

    it('devrait envoyer une requête POST pour désactiver le mode P2P', () => {
      const robotId = 'limo1';
      const enable = false;
      const mockResponse = { message: 'P2P désactivé' };

      service.toggleP2P(robotId, enable).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/${robotId}/p2p`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ enable });
      req.flush(mockResponse);
    });
  });
});