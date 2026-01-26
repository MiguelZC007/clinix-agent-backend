import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientAntecedentsDto } from './dto/update-patient-antecedents.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { PatientAntecedentsDto } from './dto/patient-antecedents.dto';

@ApiTags('Patients')
@Controller('patients')
@ApiBearerAuth('JWT-auth')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo paciente' })
  @ApiResponse({
    status: 201,
    description: 'Paciente creado exitosamente',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'Email o teléfono ya existe' })
  create(
    @Body() createPatientDto: CreatePatientDto,
  ): Promise<PatientResponseDto> {
    return this.patientService.create(createPatientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de todos los pacientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pacientes',
    type: [PatientResponseDto],
  })
  findAll(): Promise<PatientResponseDto[]> {
    return this.patientService.findAll();
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un paciente' })
  @ApiParam({ name: 'id', description: 'ID del paciente (UUID)' })
  @ApiResponse({ status: 204, description: 'Paciente eliminado' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
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
