import { encoding_for_model, TiktokenModel } from 'tiktoken';

const cachedEncoders = new Map<string, ReturnType<typeof encoding_for_model>>();

function getEncoder(model = 'gpt-4') {
  if (!cachedEncoders.has(model)) {
    cachedEncoders.set(model, encoding_for_model(model as TiktokenModel));
  }

  return cachedEncoders.get(model)!;
}

export function countTokens(text: string, tokenizerModel = 'gpt-4'): number {
  const encoder = getEncoder(tokenizerModel);
  return encoder.encode(text).length;
}

export function clearEncoderCache(): void {
  for (const encoder of cachedEncoders.values()) {
    encoder.free();
  }

  cachedEncoders.clear();
}

process.on('exit', () => clearEncoderCache());
