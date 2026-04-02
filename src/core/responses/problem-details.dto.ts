import { ApiProperty } from '@nestjs/swagger';

// Base URL for RFC 7807 Problem Details error type URIs
// Using example.com as placeholder per RFC 7807 — replace with production domain
const ERROR_TYPE_BASE_URL = 'https://api.example.com/errors';

export class ValidationErrorDto {
  @ApiProperty({ description: 'Campo con error', example: 'email' })
  field: string;

  @ApiProperty({
    description: 'Código de error de validación',
    example: 'invalid-field',
  })
  message: string;

  @ApiProperty({
    description: 'Valor rechazado',
    example: 'invalid-email',
    required: false,
  })
  rejectedValue?: unknown;
}

export class ProblemDetailsDto {
  @ApiProperty({
    description: 'URI que identifica el tipo de problema',
    example: 'https://api.example.com/errors/validation',
  })
  type: string;

  @ApiProperty({
    description: 'Título corto del problema',
    example: 'Error de validación',
  })
  title: string;

  @ApiProperty({ description: 'Código HTTP de estado', example: 400 })
  status: number;

  @ApiProperty({
    description: 'Código interno del error',
    example: 'invalid-credentials',
  })
  code: string;

  @ApiProperty({
    description: 'Código de detalle del error',
    example: 'invalid-credentials',
  })
  detail: string;

  @ApiProperty({
    description: 'Lista de errores de validación',
    type: [ValidationErrorDto],
    required: false,
  })
  errors?: ValidationErrorDto[];

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2026-01-18T10:30:00.000Z',
  })
  timestamp: string;

  constructor(partial: Partial<ProblemDetailsDto>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }
}

export enum ErrorCode {
  VALIDATION_ERROR = 'validation-error',
  REQUIRED_FIELD = 'required-field',
  INVALID_FIELD = 'invalid-field',

  INVALID_CREDENTIALS = 'invalid-credentials',
  USER_WITHOUT_PASSWORD = 'user-without-password',

  UNAUTHENTICATED = 'unauthenticated',
  UNAUTHORIZED = 'unauthorized',
  TOKEN_MISSING = 'token-missing',
  TOKEN_REVOKED = 'token-revoked',
  TOKEN_INVALID_OR_EXPIRED = 'token-invalid-or-expired',
  USER_NOT_FOUND = 'user-not-found',

  USER_ALREADY_EXISTS = 'user-already-exists',

  PATIENT_NOT_FOUND = 'patient-not-found',
  DOCTOR_NOT_FOUND = 'doctor-not-found',
  DOCTOR_NOT_FOUND_BY_PHONE = 'doctor-not-found-by-phone',
  SPECIALTY_NOT_FOUND = 'specialty-not-found',

  APPOINTMENT_NOT_FOUND = 'appointment-not-found',
  APPOINTMENT_CONFLICT = 'appointment-conflict',
  INVALID_DATE_RANGE = 'invalid-date-range',
  APPOINTMENT_ALREADY_CANCELLED = 'appointment-already-cancelled',
  APPOINTMENT_CANNOT_CANCEL_COMPLETED = 'appointment-cannot-cancel-completed',
  APPOINTMENT_ALREADY_HAS_CLINIC_HISTORY = 'appointment-already-has-clinic-history',

  CLINIC_HISTORY_NOT_FOUND = 'clinic-history-not-found',

  ACCOUNT_DISABLED = 'account-disabled',
  UNAUTHORIZED_ROLE = 'unauthorized-role',

  TWILIO_SEND_FAILED = 'twilio-send-failed',
  TWILIO_STATUS_FETCH_FAILED = 'twilio-status-fetch-failed',
  TWILIO_INCOMING_PROCESS_FAILED = 'twilio-incoming-process-failed',

  NOT_FOUND = 'not-found',
  CONFLICT = 'conflict',
  BAD_REQUEST = 'bad-request',
  UNKNOWN = 'unknown',
}

export const ErrorMessages: Record<ErrorCode, { type: string; title: string }> =
  {
    [ErrorCode.VALIDATION_ERROR]: {
      type: `${ERROR_TYPE_BASE_URL}/validation`,
      title: 'Error de validación de campos',
    },
    [ErrorCode.REQUIRED_FIELD]: {
      type: `${ERROR_TYPE_BASE_URL}/required-field`,
      title: 'Campo requerido faltante',
    },
    [ErrorCode.INVALID_FIELD]: {
      type: `${ERROR_TYPE_BASE_URL}/invalid-field`,
      title: 'Campo inválido',
    },

    [ErrorCode.INVALID_CREDENTIALS]: {
      type: `${ERROR_TYPE_BASE_URL}/invalid-credentials`,
      title: 'Credenciales inválidas',
    },
    [ErrorCode.USER_WITHOUT_PASSWORD]: {
      type: `${ERROR_TYPE_BASE_URL}/user-without-password`,
      title: 'Usuario sin contraseña configurada',
    },

    [ErrorCode.UNAUTHENTICATED]: {
      type: `${ERROR_TYPE_BASE_URL}/unauthenticated`,
      title: 'No autenticado',
    },
    [ErrorCode.UNAUTHORIZED]: {
      type: `${ERROR_TYPE_BASE_URL}/unauthorized`,
      title: 'No autorizado',
    },
    [ErrorCode.TOKEN_MISSING]: {
      type: `${ERROR_TYPE_BASE_URL}/token-missing`,
      title: 'Token no proporcionado',
    },
    [ErrorCode.TOKEN_REVOKED]: {
      type: `${ERROR_TYPE_BASE_URL}/token-revoked`,
      title: 'Token revocado',
    },
    [ErrorCode.TOKEN_INVALID_OR_EXPIRED]: {
      type: `${ERROR_TYPE_BASE_URL}/token-invalid-or-expired`,
      title: 'Token inválido o expirado',
    },
    [ErrorCode.USER_NOT_FOUND]: {
      type: `${ERROR_TYPE_BASE_URL}/user-not-found`,
      title: 'Usuario no encontrado',
    },

    [ErrorCode.USER_ALREADY_EXISTS]: {
      type: `${ERROR_TYPE_BASE_URL}/user-already-exists`,
      title: 'Recurso ya existe',
    },

    [ErrorCode.PATIENT_NOT_FOUND]: {
      type: `${ERROR_TYPE_BASE_URL}/patient-not-found`,
      title: 'Paciente no encontrado',
    },
    [ErrorCode.DOCTOR_NOT_FOUND]: {
      type: `${ERROR_TYPE_BASE_URL}/doctor-not-found`,
      title: 'Doctor no encontrado',
    },
    [ErrorCode.DOCTOR_NOT_FOUND_BY_PHONE]: {
      type: `${ERROR_TYPE_BASE_URL}/doctor-not-found-by-phone`,
      title: 'Doctor no encontrado por teléfono',
    },
    [ErrorCode.SPECIALTY_NOT_FOUND]: {
      type: `${ERROR_TYPE_BASE_URL}/specialty-not-found`,
      title: 'Especialidad no encontrada',
    },

    [ErrorCode.APPOINTMENT_NOT_FOUND]: {
      type: `${ERROR_TYPE_BASE_URL}/appointment-not-found`,
      title: 'Cita no encontrada',
    },
    [ErrorCode.APPOINTMENT_CONFLICT]: {
      type: `${ERROR_TYPE_BASE_URL}/appointment-conflict`,
      title: 'Conflicto de horario en cita',
    },
    [ErrorCode.INVALID_DATE_RANGE]: {
      type: `${ERROR_TYPE_BASE_URL}/invalid-date-range`,
      title: 'Rango de fechas inválido',
    },
    [ErrorCode.APPOINTMENT_ALREADY_CANCELLED]: {
      type: `${ERROR_TYPE_BASE_URL}/appointment-already-cancelled`,
      title: 'Cita ya cancelada',
    },
    [ErrorCode.APPOINTMENT_CANNOT_CANCEL_COMPLETED]: {
      type: `${ERROR_TYPE_BASE_URL}/appointment-cannot-cancel-completed`,
      title: 'Cita no puede ser cancelada',
    },
    [ErrorCode.APPOINTMENT_ALREADY_HAS_CLINIC_HISTORY]: {
      type: `${ERROR_TYPE_BASE_URL}/appointment-already-has-clinic-history`,
      title: 'Cita ya tiene historia clínica asociada',
    },

    [ErrorCode.CLINIC_HISTORY_NOT_FOUND]: {
      type: `${ERROR_TYPE_BASE_URL}/clinic-history-not-found`,
      title: 'Historia clínica no encontrada',
    },

    [ErrorCode.ACCOUNT_DISABLED]: {
      type: `${ERROR_TYPE_BASE_URL}/account-disabled`,
      title: 'Cuenta deshabilitada',
    },
    [ErrorCode.UNAUTHORIZED_ROLE]: {
      type: `${ERROR_TYPE_BASE_URL}/unauthorized-role`,
      title: 'Rol no autorizado',
    },

    [ErrorCode.TWILIO_SEND_FAILED]: {
      type: `${ERROR_TYPE_BASE_URL}/twilio-send-failed`,
      title: 'Error enviando mensaje',
    },
    [ErrorCode.TWILIO_STATUS_FETCH_FAILED]: {
      type: `${ERROR_TYPE_BASE_URL}/twilio-status-fetch-failed`,
      title: 'Error obteniendo estado del mensaje',
    },
    [ErrorCode.TWILIO_INCOMING_PROCESS_FAILED]: {
      type: `${ERROR_TYPE_BASE_URL}/twilio-incoming-process-failed`,
      title: 'Error procesando mensaje entrante',
    },

    [ErrorCode.NOT_FOUND]: {
      type: `${ERROR_TYPE_BASE_URL}/not-found`,
      title: 'Recurso no encontrado',
    },
    [ErrorCode.CONFLICT]: {
      type: `${ERROR_TYPE_BASE_URL}/conflict`,
      title: 'Conflicto',
    },
    [ErrorCode.BAD_REQUEST]: {
      type: `${ERROR_TYPE_BASE_URL}/bad-request`,
      title: 'Solicitud inválida',
    },
    [ErrorCode.UNKNOWN]: {
      type: `${ERROR_TYPE_BASE_URL}/unknown`,
      title: 'Error desconocido',
    },
  };
