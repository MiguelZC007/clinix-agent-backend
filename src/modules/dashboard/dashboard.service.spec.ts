import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: MockPrismaService;

  const doctorId = 'doctor-uuid';

  const mockClinicHistoryWithPatient = {
    id: 'history-uuid',
    consultationReason: 'Control rutinario',
    createdAt: new Date('2026-01-18T10:00:00.000Z'),
    patient: {
      user: { name: 'Juan', lastName: 'Pérez' },
    },
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    prisma.appointment.findMany.mockResolvedValue([
      { patientId: 'patient-1' },
      { patientId: 'patient-2' },
    ]);
    prisma.clinicHistory.findMany
      .mockImplementation((args: { where?: { doctorId?: string }; take?: number }) => {
        if (args.take === 5) {
          return Promise.resolve([mockClinicHistoryWithPatient]);
        }
        return Promise.resolve([{ patientId: 'patient-2' }, { patientId: 'patient-3' }]);
      });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(3);
    prisma.clinicHistory.count.mockResolvedValue(10);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('debe devolver resumen con estadísticas y últimas consultas', async () => {
      const result = await service.getSummary(doctorId);

      expect(result.patientsCount).toBe(3);
      expect(result.appointmentsThisWeek).toBe(3);
      expect(result.totalHistories).toBe(10);
      expect(result.consultationsToday).toBe(10);
      expect(result.recentConsultations).toHaveLength(1);
      expect(result.recentConsultations[0]).toEqual({
        id: 'history-uuid',
        patientName: 'Juan',
        patientLastName: 'Pérez',
        consultationReason: 'Control rutinario',
        createdAt: '2026-01-18T10:00:00.000Z',
      });
    });

    it('debe filtrar todas las consultas por doctorId', async () => {
      await service.getSummary(doctorId);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { doctorId },
          select: { patientId: true },
        }),
      );
      expect(prisma.clinicHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { doctorId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      );
      expect(prisma.appointment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ doctorId }),
        }),
      );
      expect(prisma.clinicHistory.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { doctorId } }),
      );
      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { registeredByDoctorId: doctorId },
          select: { id: true },
        }),
      );
    });

    it('debe calcular patientsCount como unión de pacientes de citas, historias y registrados por doctor', async () => {
      prisma.appointment.findMany.mockResolvedValue([{ patientId: 'p1' }]);
      prisma.clinicHistory.findMany
        .mockImplementation((args: { take?: number }) => {
          if (args.take === 5) return Promise.resolve([]);
          return Promise.resolve([{ patientId: 'p2' }, { patientId: 'p1' }]);
        });
      prisma.patient.findMany.mockResolvedValue([{ id: 'p3' }]);

      const result = await service.getSummary(doctorId);

      expect(result.patientsCount).toBe(3);
    });
  });
});
