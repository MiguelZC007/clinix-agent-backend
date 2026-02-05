import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { WebhookMessageDto } from './webhook-message.dto';

describe('WebhookMessageDto', () => {
  const validBase = {
    MessageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    AccountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    From: 'whatsapp:+1234567890',
    To: 'whatsapp:+14155238886',
    Body: 'Hola',
  };

  it('debe pasar validación con datos mínimos válidos', async () => {
    const dto = plainToInstance(WebhookMessageDto, validBase);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe transformar NumMedia string "0" a number y pasar validación', async () => {
    const payload = { ...validBase, NumMedia: '0' };
    const dto = plainToInstance(WebhookMessageDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.NumMedia).toBe(0);
    expect(typeof dto.NumMedia).toBe('number');
  });

  it('debe transformar NumMedia string "1" a number y pasar validación', async () => {
    const payload = { ...validBase, NumMedia: '1' };
    const dto = plainToInstance(WebhookMessageDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.NumMedia).toBe(1);
    expect(typeof dto.NumMedia).toBe('number');
  });

  it('debe aceptar NumMedia como number sin transformar', async () => {
    const payload = { ...validBase, NumMedia: 0 };
    const dto = plainToInstance(WebhookMessageDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.NumMedia).toBe(0);
  });

  it('debe fallar validación cuando NumMedia no es entero válido', async () => {
    const payload = { ...validBase, NumMedia: 'abc' };
    const dto = plainToInstance(WebhookMessageDto, payload);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'NumMedia')).toBe(true);
  });

  it('debe fallar validación cuando NumMedia es negativo', async () => {
    const payload = { ...validBase, NumMedia: '-1' };
    const dto = plainToInstance(WebhookMessageDto, payload);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'NumMedia')).toBe(true);
  });
});
