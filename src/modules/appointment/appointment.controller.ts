import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from 'src/core/decorators/user.decorator';
import { ErrorCode } from 'src/core/responses/problem-details.dto';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { PaginationResponseDto } from 'src/core/dto/pagination-response.dto';
import { FindAppointmentsQueryDto } from './dto/find-appointments-query.dto';

type DoctorRef = { id: string };
type AuthenticatedRequestUser = { doctor?: DoctorRef | null };

@ApiTags('Appointments')
@Controller('appointments')
@ApiBearerAuth('JWT-auth')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) { }

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

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cita médica (siempre para el doctor logueado)' })
  @ApiResponse({
    status: 201,
    description: 'Cita creada exitosamente',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 403, description: 'Solo doctores pueden crear citas' })
  @ApiResponse({
    status: 404,
    description: 'Paciente o especialidad no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto de horario con otra cita',
  })
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @User() user: unknown,
  ): Promise<AppointmentResponseDto> {
    const doctorId = this.getDoctorId(user);
    return this.appointmentService.create(createAppointmentDto, doctorId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de citas del doctor logueado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de citas paginada',
    type: PaginationResponseDto<AppointmentResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'Solo doctores pueden listar citas' })
  findAll(
    @Query() query: FindAppointmentsQueryDto,
    @User() user: unknown,
  ): Promise<PaginationResponseDto<AppointmentResponseDto>> {
    const doctorId = this.getDoctorId(user);
    return this.appointmentService.findAll(
      doctorId,
      query.page ?? 1,
      query.limit ?? 10,
      query.startDate,
      query.endDate,
      query.status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cita por ID (solo si es del doctor logueado)' })
  @ApiParam({ name: 'id', description: 'ID de la cita (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cita encontrada',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 403, description: 'La cita no pertenece al doctor' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: unknown,
  ): Promise<AppointmentResponseDto> {
    const doctorId = this.getDoctorId(user);
    return this.appointmentService.findOne(id, doctorId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una cita (solo si es del doctor logueado)' })
  @ApiParam({ name: 'id', description: 'ID de la cita (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cita actualizada',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 403, description: 'La cita no pertenece al doctor' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto de horario con otra cita',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @User() user: unknown,
  ): Promise<AppointmentResponseDto> {
    const doctorId = this.getDoctorId(user);
    return this.appointmentService.update(id, updateAppointmentDto, doctorId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una cita (solo si es del doctor logueado)' })
  @ApiParam({ name: 'id', description: 'ID de la cita (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cita cancelada',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'La cita no puede ser cancelada' })
  @ApiResponse({ status: 403, description: 'La cita no pertenece al doctor' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: unknown,
  ): Promise<AppointmentResponseDto> {
    const doctorId = this.getDoctorId(user);
    return this.appointmentService.cancel(id, doctorId);
  }
}

@ApiTags('Patients')
@Controller('patients')
@ApiBearerAuth('JWT-auth')
export class PatientAppointmentsController {
  constructor(private readonly appointmentService: AppointmentService) { }

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

  @Get(':patientId/appointments')
  @ApiOperation({ summary: 'Obtener citas del paciente para el doctor logueado' })
  @ApiParam({ name: 'patientId', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de citas del paciente con el doctor',
    type: [AppointmentResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Solo doctores pueden consultar' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @User() user: unknown,
  ): Promise<AppointmentResponseDto[]> {
    const doctorId = this.getDoctorId(user);
    return this.appointmentService.findByPatient(patientId, doctorId);
  }
}
