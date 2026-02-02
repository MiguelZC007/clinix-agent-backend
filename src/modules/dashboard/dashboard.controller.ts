import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from 'src/core/decorators/user.decorator';
import { ErrorCode } from 'src/core/responses/problem-details.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary-response.dto';
import { DashboardService } from './dashboard.service';

type DoctorRef = { id: string };
type AuthenticatedRequestUser = { doctor?: DoctorRef | null };

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen del dashboard del doctor autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Resumen con estadísticas y últimas consultas',
    type: DashboardSummaryDto,
  })
  @ApiResponse({ status: 403, description: 'Solo doctores pueden acceder' })
  async getSummary(@User() user: unknown): Promise<DashboardSummaryDto> {
    const doctorId = this.getDoctorId(user);
    return this.dashboardService.getSummary(doctorId);
  }

  private getDoctorId(user: unknown): string {
    if (!user || typeof user !== 'object') {
      throw new ForbiddenException(ErrorCode.UNAUTHORIZED);
    }
    const doctor = (user as AuthenticatedRequestUser).doctor;
    if (!doctor || typeof doctor !== 'object') {
      throw new ForbiddenException(ErrorCode.UNAUTHORIZED);
    }
    const id = (doctor as DoctorRef).id;
    if (typeof id !== 'string' || id.length === 0) {
      throw new ForbiddenException(ErrorCode.UNAUTHORIZED);
    }
    return id;
  }
}
