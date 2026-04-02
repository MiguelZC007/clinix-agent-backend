import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from 'src/core/decorators/user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { Role } from 'src/core/enum/role.enum';
import { AdminService, DoctorListResultDto } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { AuditLogQueryDto } from '../audit/dto/audit-log-query.dto';
import {
  CreateDoctorDto,
  UpdateDoctorDto,
  DoctorResponseDto,
  DoctorListQueryDto,
} from './dto';

interface UserContext {
  id: string;
  email: string;
  name: string;
  lastName: string;
  phone: string;
  doctor?: { id: string };
  patient?: { id: string };
}

@ApiTags('Admin')
@Controller('admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  @Post('doctors')
  @ApiOperation({ summary: 'Crear un nuevo doctor' })
  @ApiResponse({
    status: 201,
    description: 'Doctor creado exitosamente',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'Email, teléfono o licencia ya existe' })
  @ApiResponse({ status: 404, description: 'Especialidad no encontrada' })
  createDoctor(
    @Body() dto: CreateDoctorDto,
    @User() user: UserContext,
  ): Promise<DoctorResponseDto> {
    return this.adminService.createDoctor(dto, user.id);
  }

  @Get('doctors')
  @ApiOperation({ summary: 'Listar doctores con paginación y filtros' })
  @ApiResponse({
    status: 200,
    description: 'Lista de doctores',
  })
  findAllDoctors(
    @Query() query: DoctorListQueryDto,
  ): Promise<DoctorListResultDto> {
    return this.adminService.findAllDoctors(query);
  }

  @Get('doctors/:id')
  @ApiOperation({ summary: 'Obtener detalle de un doctor' })
  @ApiParam({ name: 'id', description: 'ID del doctor' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del doctor',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  findOneDoctor(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DoctorResponseDto> {
    return this.adminService.findOneDoctor(id);
  }

  @Patch('doctors/:id')
  @ApiOperation({ summary: 'Actualizar datos de un doctor' })
  @ApiParam({ name: 'id', description: 'ID del doctor' })
  @ApiResponse({
    status: 200,
    description: 'Doctor actualizado',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor o especialidad no encontrada' })
  @ApiResponse({ status: 409, description: 'Número de licencia duplicado' })
  updateDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorDto,
    @User() user: UserContext,
  ): Promise<DoctorResponseDto> {
    return this.adminService.updateDoctor(id, dto, user.id);
  }

  @Post('doctors/:id/deactivate')
  @ApiOperation({ summary: 'Desactivar un doctor (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del doctor' })
  @ApiResponse({
    status: 200,
    description: 'Doctor desactivado',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  @ApiResponse({ status: 409, description: 'Doctor ya está inactivo' })
  deactivateDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: UserContext,
  ): Promise<DoctorResponseDto> {
    return this.adminService.deactivateDoctor(id, user.id);
  }

  @Post('doctors/:id/activate')
  @ApiOperation({ summary: 'Reactivar un doctor' })
  @ApiParam({ name: 'id', description: 'ID del doctor' })
  @ApiResponse({
    status: 200,
    description: 'Doctor reactivado',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  @ApiResponse({ status: 409, description: 'Doctor ya está activo' })
  activateDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: UserContext,
  ): Promise<DoctorResponseDto> {
    return this.adminService.activateDoctor(id, user.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Consultar logs de auditoría' })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoría',
  })
  findAuditLogs(
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.findAll(query);
  }

  @Get('audit-logs/:id')
  @ApiOperation({ summary: 'Obtener detalle de un log de auditoría' })
  @ApiParam({ name: 'id', description: 'ID del log de auditoría' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del log de auditoría',
  })
  @ApiResponse({ status: 404, description: 'Log de auditoría no encontrado' })
  findOneAuditLog(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auditService.findOne(id);
  }
}
