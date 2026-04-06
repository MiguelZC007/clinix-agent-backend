import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export const MIN_CONTEXT_TOKEN_LIMIT_OVERRIDE = 4_096;
export const MAX_CONTEXT_TOKEN_LIMIT_OVERRIDE = 1_000_000;

export class UpdateConversationDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return Number(value);
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(MIN_CONTEXT_TOKEN_LIMIT_OVERRIDE)
  @Max(MAX_CONTEXT_TOKEN_LIMIT_OVERRIDE)
  contextTokenLimitOverride?: number | null;
}
