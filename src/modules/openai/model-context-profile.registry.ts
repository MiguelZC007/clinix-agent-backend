import { Logger } from '@nestjs/common';

export interface ModelContextProfile {
  model: string;
  tokenizerModel: string;
  contextWindow: number;
  reservedForCompletion: number;
  safetyMargin: number;
  compactionTriggerRatio: number;
  compactionTargetRatio: number;
}

const DEFAULT_PROFILE: ModelContextProfile = {
  model: 'gpt-4o-mini',
  tokenizerModel: 'gpt-4o-mini',
  contextWindow: 128_000,
  reservedForCompletion: 8_192,
  safetyMargin: 4_096,
  compactionTriggerRatio: 0.88,
  compactionTargetRatio: 0.72,
};

const MODEL_CONTEXT_PROFILES: Record<string, ModelContextProfile> = {
  'gpt-4': {
    model: 'gpt-4',
    tokenizerModel: 'gpt-4',
    contextWindow: 128_000,
    reservedForCompletion: 8_192,
    safetyMargin: 4_096,
    compactionTriggerRatio: 0.88,
    compactionTargetRatio: 0.72,
  },
  'gpt-4o': {
    model: 'gpt-4o',
    tokenizerModel: 'gpt-4o',
    contextWindow: 128_000,
    reservedForCompletion: 8_192,
    safetyMargin: 4_096,
    compactionTriggerRatio: 0.88,
    compactionTargetRatio: 0.72,
  },
  'gpt-4o-mini': DEFAULT_PROFILE,
  'gpt-4.1': {
    model: 'gpt-4.1',
    tokenizerModel: 'gpt-4.1',
    contextWindow: 1_000_000,
    reservedForCompletion: 16_384,
    safetyMargin: 8_192,
    compactionTriggerRatio: 0.9,
    compactionTargetRatio: 0.75,
  },
  'gpt-4.1-mini': {
    model: 'gpt-4.1-mini',
    tokenizerModel: 'gpt-4.1-mini',
    contextWindow: 1_000_000,
    reservedForCompletion: 8_192,
    safetyMargin: 4_096,
    compactionTriggerRatio: 0.9,
    compactionTargetRatio: 0.75,
  },
};

const logger = new Logger('ModelContextProfileRegistry');

function normalizeModelKey(model: string): string {
  return model.trim().toLowerCase();
}

export function resolveModelContextProfile(model: string): ModelContextProfile {
  const normalized = normalizeModelKey(model);
  const profile = MODEL_CONTEXT_PROFILES[normalized];

  if (profile) {
    return profile;
  }

  logger.warn(
    `Unknown OpenAI model "${model}". Falling back to conservative context profile "${DEFAULT_PROFILE.model}".`,
  );

  return DEFAULT_PROFILE;
}

export function listModelContextProfiles(): ModelContextProfile[] {
  return Object.values(MODEL_CONTEXT_PROFILES);
}
