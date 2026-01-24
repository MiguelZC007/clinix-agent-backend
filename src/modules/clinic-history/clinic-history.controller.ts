import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ClinicHistoryService } from './clinic-history.service';
import { CreateClinicHistoryDto } from './dto/create-clinic-history.dto';
import { ClinicHistoryResponseDto } from './dto/clinic-history-response.dto';

@ApiTags('Clinic Histories')
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
  ): Promise<ClinicHistoryResponseDto> {
    return this.clinicHistoryService.create(createClinicHistoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de todas las historias clínicas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de historias clínicas',
    type: [ClinicHistoryResponseDto],
  })
  findAll(): Promise<ClinicHistoryResponseDto[]> {
    return this.clinicHistoryService.findAll();
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
  ): Promise<ClinicHistoryResponseDto> {
    return this.clinicHistoryService.findOne(id);
  }
}

@ApiTags('Patients')
@Controller('patients')
export class PatientClinicHistoriesController {
  constructor(private readonly clinicHistoryService: ClinicHistoryService) {}

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
  ): Promise<ClinicHistoryResponseDto[]> {
    return this.clinicHistoryService.findByPatient(patientId);
  }
}
