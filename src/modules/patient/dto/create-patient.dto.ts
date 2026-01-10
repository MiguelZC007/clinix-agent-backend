import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Gender } from 'src/core/enum/gender.enum';

export class CreatePatientDto {
  @ApiProperty({
    description: 'The name of the patient',
    example: 'John',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The last name of the patient',
    example: 'Doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'The age of the patient',
    example: 30,
  })
  @IsNumber()
  age: number;

  @ApiProperty({
    description: 'The gender of the patient',
    example: 'male',
    enum: Gender,
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: 'The allergies of the patient',
    example: ['peanuts', 'penicillin'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({
    description: 'The medications of the patient',
    example: ['aspirin', 'metformin'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiProperty({
    description: 'The medical history of the patient',
    example: ['diabetes', 'hypertension'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalHistory?: string[];

  @ApiProperty({
    description: 'The family history of the patient',
    example: ['heart disease', 'cancer'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  familyHistory?: string[];
}
