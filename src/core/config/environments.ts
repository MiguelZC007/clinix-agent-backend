import { IsNotEmpty, IsNumber, IsString, validateSync } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import 'dotenv/config';

class EnvVariables {
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber()
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber()
  @IsNotEmpty()
  SALT_ROUND: number;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRATION_TIME: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRATION_TIME: string;

  // @IsString()
  // @IsNotEmpty()
  // AWS_S3_ACCESS_KEY: string;
  //
  // @IsString()
  // @IsNotEmpty()
  // AWS_S3_SECRET_KEY: string;
  //
  // @IsString()
  // @IsNotEmpty()
  // AWS_S3_REGION: string;
  //
  // @IsString()
  // @IsNotEmpty()
  // AWS_S3_ENDPOINT: string;
  //
  // @IsString()
  // @IsNotEmpty()
  // AWS_S3_BUCKET: string;
  //
  // @Transform(({ value }: { value: string }) => parseInt(value, 10))
  // @IsNumber()
  // @IsNotEmpty()
  // AWS_EXPIRATION_SIGNED_URL: number;

  @IsString()
  @IsNotEmpty()
  OPENAI_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  OPENAI_MODEL: string;

  @IsString()
  @IsNotEmpty()
  TWILIO_ACCOUNT_SID: string;

  @IsString()
  @IsNotEmpty()
  TWILIO_AUTH_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  TWILIO_WHATSAPP_FROM: string;
}

const environment = plainToInstance(EnvVariables, {
  ...process.env,
});

const errors = validateSync(environment);
if (errors.length > 0) {
  console.error('Environment validation errors:', errors);
  throw new Error(
    `Invalid environment variables: ${errors.map((e) => e.toString()).join(', ')}`,
  );
}

export default environment;
