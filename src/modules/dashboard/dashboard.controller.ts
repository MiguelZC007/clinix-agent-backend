import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from 'src/core/decorators/user.decorator';
import { getDoctorId } from 'src/common/utils/get-doctor-id.util';
import { DashboardSummaryDto } from './dto/dashboard-summary-response.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumen del dashboard del doctor autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Resumen con estadísticas y últimas consultas',
    type: DashboardSummaryDto,
  })
  @ApiResponse({ status: 403, description: 'Solo doctores pueden acceder' })
  async getSummary(@User() user: unknown): Promise<DashboardSummaryDto> {
    const doctorId = getDoctorId(user);
    return this.dashboardService.getSummary(doctorId);
  }
}
