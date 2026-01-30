const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function isE164(phone: string): boolean {
  const normalized = phone.startsWith('whatsapp:')
    ? phone.slice(9).trim()
    : phone.trim();
  return E164_PATTERN.test(normalized);
}

export const E164_REGEX = /^(whatsapp:)?\+[1-9]\d{6,14}$/;
