import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorDto {
  @ApiProperty({ description: 'Campo con error', example: 'email' })
  field: string;

  @ApiProperty({ description: 'Mensaje de error', example: 'El email no es válido' })
  message: string;

  @ApiProperty({ description: 'Valor rechazado', example: 'invalid-email', required: false })
  rejectedValue?: unknown;
}

export class ProblemDetailsDto {
  @ApiProperty({ description: 'URI que identifica el tipo de problema', example: 'https://api.example.com/errors/validation' })
  type: string;

  @ApiProperty({ description: 'Título corto del problema', example: 'Error de validación' })
  title: string;

  @ApiProperty({ description: 'Código HTTP de estado', example: 400 })
  status: number;

  @ApiProperty({ description: 'Código interno del error', example: 'VAL_001' })
  code: string;

  @ApiProperty({ description: 'Descripción detallada del error', example: 'Los datos enviados no son válidos' })
  detail: string;

  @ApiProperty({ description: 'Lista de errores de validación', type: [ValidationErrorDto], required: false })
  errors?: ValidationErrorDto[];

  @ApiProperty({ description: 'Timestamp del error', example: '2026-01-18T10:30:00.000Z' })
  timestamp: string;

  constructor(partial: Partial<ProblemDetailsDto>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }
}

export enum ErrorCode {
  VAL_001 = 'VAL_001',
  VAL_002 = 'VAL_002',
  RES_001 = 'RES_001',
  RES_002 = 'RES_002',
  APP_001 = 'APP_001',
  APP_002 = 'APP_002',
  AUTH_001 = 'AUTH_001',
  AUTH_002 = 'AUTH_002',
}

export const ErrorMessages: Record<ErrorCode, { type: string; title: string }> = {
  [ErrorCode.VAL_001]: {
    type: 'https://api.example.com/errors/validation',
    title: 'Error de validación de campos',
  },
  [ErrorCode.VAL_002]: {
    type: 'https://api.example.com/errors/required-field',
    title: 'Campo requerido faltante',
  },
  [ErrorCode.RES_001]: {
    type: 'https://api.example.com/errors/not-found',
    title: 'Recurso no encontrado',
  },
  [ErrorCode.RES_002]: {
    type: 'https://api.example.com/errors/duplicate',
    title: 'Recurso ya existe',
  },
  [ErrorCode.APP_001]: {
    type: 'https://api.example.com/errors/schedule-conflict',
    title: 'Conflicto de horario en cita',
  },
  [ErrorCode.APP_002]: {
    type: 'https://api.example.com/errors/cannot-cancel',
    title: 'Cita no puede ser cancelada',
  },
  [ErrorCode.AUTH_001]: {
    type: 'https://api.example.com/errors/unauthenticated',
    title: 'No autenticado',
  },
  [ErrorCode.AUTH_002]: {
    type: 'https://api.example.com/errors/unauthorized',
    title: 'No autorizado',
  },
};
