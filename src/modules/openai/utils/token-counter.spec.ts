import { countTokens } from './token-counter';

describe('countTokens', () => {
  it('debe retornar aproximadamente 2 tokens para "hello world"', async () => {
    const result = await countTokens('hello world');
    // "hello world" should be ~2 tokens with cl100k_base
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(4);
  });

  it('debe retornar un conteo diferente al wordCount × 1.3 para texto en español', async () => {
    const spanishText = 'el paciente tiene dolor';
    const result = await countTokens(spanishText);
    const wordCountBasedEstimate = Math.ceil(spanishText.split(/\s+/).length * 1.3);
    // tiktoken should NOT equal wordCount × 1.3 for Spanish text
    expect(result).not.toBe(wordCountBasedEstimate);
  });

  it('debe retornar un conteo de tokens para una oración más larga', async () => {
    const longText = 'El paciente presenta síntomas de dolor de cabeza persistente desde hace tres días con intensidad moderada';
    const result = await countTokens(longText);
    // Should be a reasonable token count
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(longText.length); // tokens should be fewer than chars
  });

  it('debe manejar texto vacío', async () => {
    const result = await countTokens('');
    expect(result).toBe(0);
  });

  it('debe manejar texto con espacios múltiples', async () => {
    const textWithSpaces = 'hola     mundo';
    const result = await countTokens(textWithSpaces);
    expect(result).toBeGreaterThan(0);
  });
});
