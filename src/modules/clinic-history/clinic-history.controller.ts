import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { User } from 'src/core/decorators/user.decorator';
import { getDoctorId } from 'src/common/utils/get-doctor-id.util';
import {
  ClinicHistoryService,
  ClinicHistoryListResultDto,
} from './clinic-history.service';
import { CreateClinicHistoryDto } from './dto/create-clinic-history.dto';
import { FindAllClinicHistoriesQueryDto } from './dto/find-all-clinic-histories-query.dto';
import { ClinicHistoryResponseDto } from './dto/clinic-history-response.dto';
import { PatientClinicHistoryFilterOptionsDto } from './dto/patient-clinic-history-filter-options.dto';

@ApiTags('Clinic Histories')
@ApiBearerAuth('JWT-auth')
@Controller('clinic-histories')
export class ClinicHistoryController {
  constructor(private readonly clinicHistoryService: ClinicHistoryService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva historia clínica' })
  @ApiResponse({
    status: 201,
    description: 'Historia clínica creada exitosamente',
    type: ClinicHistoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'La cita ya tiene una historia clínica',
  })
  create(
    @Body() createClinicHistoryDto: CreateClinicHistoryDto,
    @User() user: unknown,
  ): Promise<ClinicHistoryResponseDto> {
    const doctorId = getDoctorId(user);
    return this.clinicHistoryService.create(createClinicHistoryDto, doctorId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista paginada de historias clínicas' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de historias clínicas',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/ClinicHistoryResponseDto' },
        },
        page: { type: 'number' },
        pageSize: { type: 'number' },
        total: { type: 'number' },
        totalPages: { type: 'number' },
      },
    } as SchemaObject,
  })
  findAll(
    @Query() query: FindAllClinicHistoriesQueryDto,
    @User() user: unknown,
  ): Promise<ClinicHistoryListResultDto> {
    const doctorId = getDoctorId(user);
    return this.clinicHistoryService.findAll(query, doctorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una historia clínica por ID' })
  @ApiParam({ name: 'id', description: 'ID de la historia clínica (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Historia clínica encontrada',
    type: ClinicHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Historia clínica no encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: unknown,
  ): Promise<ClinicHistoryResponseDto> {
    const doctorId = getDoctorId(user);
    return this.clinicHistoryService.findOne(id, doctorId);
  }
}

@ApiTags('Patients')
@ApiBearerAuth('JWT-auth')
@Controller('patients')
export class PatientClinicHistoriesController {
  constructor(private readonly clinicHistoryService: ClinicHistoryService) {}

  @Get(':patientId/clinic-histories/filter-options')
  @ApiOperation({
    summary: 'Obtener opciones de filtro para historias clínicas del paciente',
  })
  @ApiParam({ name: 'patientId', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description:
      'Doctores y especialidades presentes en las historias del paciente',
    type: PatientClinicHistoryFilterOptionsDto,
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  getFilterOptions(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @User() user: unknown,
  ): Promise<PatientClinicHistoryFilterOptionsDto> {
    const doctorId = getDoctorId(user);
    return this.clinicHistoryService.getFilterOptionsByPatient(
      patientId,
      doctorId,
    );
  }

  @Get(':patientId/clinic-histories')
  @ApiOperation({ summary: 'Obtener historias clínicas de un paciente' })
  @ApiParam({ name: 'patientId', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de historias clínicas del paciente',
    type: [ClinicHistoryResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @User() user: unknown,
  ): Promise<ClinicHistoryResponseDto[]> {
    const doctorId = getDoctorId(user);
    return this.clinicHistoryService.findByPatient(patientId, doctorId);
  }
}
