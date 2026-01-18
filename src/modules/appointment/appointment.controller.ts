import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cita médica' })
  @ApiResponse({
    status: 201,
    description: 'Cita creada exitosamente',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 404, description: 'Paciente, doctor o especialidad no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto de horario con otra cita' })
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.create(createAppointmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de todas las citas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de citas',
    type: [AppointmentResponseDto],
  })
  findAll(): Promise<AppointmentResponseDto[]> {
    return this.appointmentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cita por ID' })
  @ApiParam({ name: 'id', description: 'ID de la cita (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cita encontrada',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AppointmentResponseDto> {
    return this.appointmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una cita' })
  @ApiParam({ name: 'id', description: 'ID de la cita (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cita actualizada',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  @ApiResponse({ status: 409, description: 'Conflicto de horario con otra cita' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.update(id, updateAppointmentDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una cita' })
  @ApiParam({ name: 'id', description: 'ID de la cita (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cita cancelada',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'La cita no puede ser cancelada' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<AppointmentResponseDto> {
    return this.appointmentService.cancel(id);
  }
}

@ApiTags('Patients')
@Controller('patients')
export class PatientAppointmentsController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get(':patientId/appointments')
  @ApiOperation({ summary: 'Obtener citas de un paciente' })
  @ApiParam({ name: 'patientId', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de citas del paciente',
    type: [AppointmentResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentService.findByPatient(patientId);
  }
}
