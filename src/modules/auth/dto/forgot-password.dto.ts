import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Número de celular del usuario (E.164)',
    example: '+584241234567',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;
}
