import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { User } from 'src/core/decorators/user.decorator';
import { Roles } from 'src/core/decorators/roles.decorator';
import { Role } from 'src/core/enum/role.enum';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { AdminService, DoctorListResultDto } from './admin.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { DoctorListQueryDto } from './dto/doctor-list-query.dto';

@ApiTags('Admin')
@Controller('admin/doctors')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener lista de doctores paginada' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de doctores',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/DoctorResponseDto' },
        },
        page: { type: 'number' },
        pageSize: { type: 'number' },
        total: { type: 'number' },
        totalPages: { type: 'number' },
      },
    } as SchemaObject,
  })
  findAll(@Query() query: DoctorListQueryDto): Promise<DoctorListResultDto> {
    return this.adminService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un doctor por ID' })
  @ApiParam({ name: 'id', description: 'ID del doctor (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Doctor encontrado',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DoctorResponseDto> {
    return this.adminService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo doctor' })
  @ApiResponse({
    status: 201,
    description: 'Doctor creado exitosamente',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'Email o teléfono ya existe' })
  create(
    @Body() createDoctorDto: CreateDoctorDto,
    @User() user: { id: string },
  ): Promise<DoctorResponseDto> {
    return this.adminService.create(createDoctorDto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un doctor' })
  @ApiParam({ name: 'id', description: 'ID del doctor (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Doctor actualizado',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  @ApiResponse({ status: 409, description: 'Email o teléfono ya existe' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDoctorDto: UpdateDoctorDto,
    @User() user: { id: string },
  ): Promise<DoctorResponseDto> {
    return this.adminService.update(id, updateDoctorDto, user.id);
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Desactivar un doctor' })
  @ApiParam({ name: 'id', description: 'ID del doctor (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Doctor desactivado',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  disable(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: { id: string },
  ): Promise<DoctorResponseDto> {
    return this.adminService.disable(id, user.id);
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Activar un doctor' })
  @ApiParam({ name: 'id', description: 'ID del doctor (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Doctor activado',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  enable(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: { id: string },
  ): Promise<DoctorResponseDto> {
    return this.adminService.enable(id, user.id);
  }
}
