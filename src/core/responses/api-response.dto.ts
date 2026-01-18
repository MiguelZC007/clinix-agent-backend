import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indica si la operación fue exitosa', example: true })
  success: boolean;

  @ApiProperty({ description: 'Datos de la respuesta' })
  data: T;

  @ApiProperty({ description: 'Mensaje opcional', example: 'Operación realizada con éxito', required: false })
  message?: string;

  @ApiProperty({ description: 'Timestamp de la respuesta', example: '2026-01-18T10:30:00.000Z' })
  timestamp: string;

  constructor(data: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }

  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto(data, message);
  }
}
