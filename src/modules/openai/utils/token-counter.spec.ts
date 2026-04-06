import { clearEncoderCache, countTokens } from './token-counter';

describe('countTokens', () => {
  afterEach(() => {
    clearEncoderCache();
  });

  it('cuenta tokens con el tokenizer por defecto', () => {
    const result = countTokens('hello world');

    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(4);
  });

  it('permite seleccionar el tokenizer del modelo activo', () => {
    const result = countTokens('hola mundo', 'gpt-4o');

    expect(result).toBeGreaterThan(0);
  });

  it('mantiene fallback determinístico para textos vacíos y español', () => {
    expect(countTokens('')).toBe(0);
    expect(countTokens('el paciente tiene dolor', 'gpt-4')).toBeGreaterThan(0);
  });
});
