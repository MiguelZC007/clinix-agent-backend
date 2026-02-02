import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
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
import { ErrorCode } from 'src/core/responses/problem-details.dto';
import { PatientService, PatientListResultDto } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientAntecedentsDto } from './dto/update-patient-antecedents.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { PatientAntecedentsDto } from './dto/patient-antecedents.dto';
import { PatientListQueryDto } from './dto/patient-list-query.dto';

type DoctorRef = { id: string };
type AuthenticatedRequestUser = { doctor?: DoctorRef | null };

@ApiTags('Patients')
@Controller('patients')
@ApiBearerAuth('JWT-auth')
export class PatientController {
  constructor(private readonly patientService: PatientService) { }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo paciente' })
  @ApiResponse({
    status: 201,
    description: 'Paciente creado exitosamente',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'Email o teléfono ya existe' })
  @ApiResponse({ status: 403, description: 'Solo doctores pueden registrar pacientes' })
  create(
    @Body() createPatientDto: CreatePatientDto,
    @User() user: unknown,
  ): Promise<PatientResponseDto> {
    const doctorId = this.getDoctorId(user);
    return this.patientService.create(createPatientDto, doctorId);
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

  @Get()
  @ApiOperation({ summary: 'Obtener lista de pacientes paginada' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pacientes',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/PatientResponseDto' } },
        page: { type: 'number' },
        pageSize: { type: 'number' },
        total: { type: 'number' },
        totalPages: { type: 'number' },
      },
    } as SchemaObject,
  })
  findAll(@Query() query: PatientListQueryDto): Promise<PatientListResultDto> {
    return this.patientService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un paciente por ID' })
  @ApiParam({ name: 'id', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Paciente encontrado',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PatientResponseDto> {
    return this.patientService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un paciente' })
  @ApiParam({ name: 'id', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Paciente actualizado',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({ status: 409, description: 'Email o teléfono ya existe' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    return this.patientService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un paciente' })
  @ApiParam({ name: 'id', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Paciente eliminado',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean', example: true },
        id: { type: 'string' },
      },
    } as SchemaObject,
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ deleted: true; id: string }> {
    return this.patientService.remove(id);
  }

  @Get(':id/antecedents')
  @ApiOperation({ summary: 'Obtener antecedentes de un paciente' })
  @ApiParam({ name: 'id', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Antecedentes del paciente',
    type: PatientAntecedentsDto,
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  getAntecedents(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PatientAntecedentsDto> {
    return this.patientService.getAntecedents(id);
  }

  @Put(':id/antecedents')
  @ApiOperation({ summary: 'Actualizar antecedentes de un paciente' })
  @ApiParam({ name: 'id', description: 'ID del paciente (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Antecedentes actualizados',
    type: PatientAntecedentsDto,
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  updateAntecedents(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAntecedentsDto: UpdatePatientAntecedentsDto,
  ): Promise<PatientAntecedentsDto> {
    return this.patientService.updateAntecedents(id, updateAntecedentsDto);
  }
}
