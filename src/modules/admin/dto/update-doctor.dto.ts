import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDoctorDto } from './create-doctor.dto';

export class UpdateDoctorDto extends PartialType(
  OmitType(CreateDoctorDto, ['email', 'phone', 'password'] as const),
) {}
