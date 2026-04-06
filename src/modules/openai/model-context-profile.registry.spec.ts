import { Logger } from '@nestjs/common';
import {
  listModelContextProfiles,
  resolveModelContextProfile,
} from './model-context-profile.registry';

describe('model-context-profile.registry', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resuelve perfiles conocidos', () => {
    const profile = resolveModelContextProfile('gpt-4');

    expect(profile.model).toBe('gpt-4');
    expect(profile.contextWindow).toBe(128_000);
    expect(profile.reservedForCompletion).toBeGreaterThan(0);
  });

  it('usa un fallback conservador para modelos desconocidos', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const profile = resolveModelContextProfile('custom-unknown-model');

    expect(profile.model).toBe('gpt-4o-mini');
    expect(profile.contextWindow).toBe(128_000);
    expect(profile.compactionTriggerRatio).toBeLessThan(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown OpenAI model'),
    );
  });

  it('expone un tokenizer model por perfil', () => {
    const profile = resolveModelContextProfile('gpt-4o');

    expect(profile.tokenizerModel).toBe('gpt-4o');
    expect(
      listModelContextProfiles().some((item) => item.model === 'gpt-4o'),
    ).toBe(true);
  });

  it('no loguea warnings para modelos conocidos', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    resolveModelContextProfile('gpt-4o-mini');

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
