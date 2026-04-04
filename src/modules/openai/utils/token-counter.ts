import { encoding_for_model } from 'tiktoken';

let cachedEncoder: ReturnType<typeof encoding_for_model> | null = null;

function getEncoder() {
  if (!cachedEncoder) {
    cachedEncoder = encoding_for_model('gpt-4');
  }
  return cachedEncoder;
}

export function countTokens(text: string): number {
  const encoder = getEncoder();
  const tokens = encoder.encode(text);
  return tokens.length;
}

export function clearEncoderCache(): void {
  if (cachedEncoder) {
    cachedEncoder.free();
    cachedEncoder = null;
  }
}

// Free encoder on process exit to prevent WASM resource leaks
process.on('exit', () => clearEncoderCache());
