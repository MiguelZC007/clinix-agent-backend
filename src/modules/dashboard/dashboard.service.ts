import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DashboardSummaryDto,
  RecentConsultationDto,
} from './dto/dashboard-summary-response.dto';

const RECENT_CONSULTATIONS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(doctorId: string): Promise<DashboardSummaryDto> {
    const [
      patientsCount,
      appointmentsThisWeek,
      totalHistories,
      consultationsToday,
      recentHistories,
    ] = await Promise.all([
      this.patientsCount(doctorId),
      this.appointmentsThisWeek(doctorId),
      this.totalHistories(doctorId),
      this.consultationsToday(doctorId),
      this.recentConsultations(doctorId, RECENT_CONSULTATIONS_LIMIT),
    ]);

    return {
      patientsCount,
      appointmentsThisWeek,
      totalHistories,
      consultationsToday,
      recentConsultations: recentHistories,
    };
  }

  private async patientsCount(doctorId: string): Promise<number> {
    // Use SQL-level COUNT(DISTINCT ...) to count unique patients across three sources
    // without loading all records into memory
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT patient_id) as count
      FROM (
        SELECT patient_id FROM appointments WHERE doctor_id = ${doctorId}
        UNION
        SELECT patient_id FROM clinic_histories WHERE doctor_id = ${doctorId}
        UNION
        SELECT id as patient_id FROM patients WHERE registered_by_doctor_id = ${doctorId}
      ) as all_patients
    `;
    return Number(result[0]?.count ?? 0);
  }

  private getWeekBoundsUTC(): { start: Date; end: Date } {
    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() + diffToMonday);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  private getTodayBoundsUTC(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    return { start, end };
  }

  private async appointmentsThisWeek(doctorId: string): Promise<number> {
    const { start, end } = this.getWeekBoundsUTC();
    return this.prisma.appointment.count({
      where: {
        doctorId,
        startAppointment: { gte: start, lte: end },
      },
    });
  }

  private async totalHistories(doctorId: string): Promise<number> {
    return this.prisma.clinicHistory.count({
      where: { doctorId },
    });
  }

  private async consultationsToday(doctorId: string): Promise<number> {
    const { start, end } = this.getTodayBoundsUTC();
    return this.prisma.clinicHistory.count({
      where: {
        doctorId,
        createdAt: { gte: start, lte: end },
      },
    });
  }

  private async recentConsultations(
    doctorId: string,
    limit: number,
  ): Promise<RecentConsultationDto[]> {
    const histories = await this.prisma.clinicHistory.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        patient: { include: { user: true } },
      },
    });
    return histories.map((h) => ({
      id: h.id,
      patientName: h.patient.user.name,
      patientLastName: h.patient.user.lastName,
      consultationReason: h.consultationReason,
      createdAt: h.createdAt.toISOString(),
    }));
  }
}
