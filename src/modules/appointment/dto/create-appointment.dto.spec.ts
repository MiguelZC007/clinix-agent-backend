import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAppointmentDto } from './create-appointment.dto';

describe('CreateAppointmentDto', () => {
  const validData = {
    patientId: '550e8400-e29b-41d4-a716-446655440000',
    doctorId: '550e8400-e29b-41d4-a716-446655440001',
    specialtyId: '550e8400-e29b-41d4-a716-446655440002',
    startAppointment: '2026-01-20T09:00:00.000Z',
    endAppointment: '2026-01-20T09:30:00.000Z',
  };

  it('debe pasar validación con datos válidos', async () => {
    const dto = plainToInstance(CreateAppointmentDto, validData);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('patientId', () => {
    it('debe fallar si patientId está vacío', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        patientId: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'patientId')).toBe(true);
    });

    it('debe fallar si patientId no es UUID', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        patientId: 'no-es-uuid',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'patientId')).toBe(true);
    });
  });

  describe('doctorId', () => {
    it('debe fallar si doctorId está vacío', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        doctorId: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'doctorId')).toBe(true);
    });

    it('debe fallar si doctorId no es UUID', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        doctorId: '12345',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'doctorId')).toBe(true);
    });
  });

  describe('specialtyId', () => {
    it('debe fallar si specialtyId está vacío', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        specialtyId: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'specialtyId')).toBe(true);
    });

    it('debe fallar si specialtyId no es UUID', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        specialtyId: 'invalid-uuid',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'specialtyId')).toBe(true);
    });
  });

  describe('startAppointment', () => {
    it('debe fallar si startAppointment está vacío', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        startAppointment: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'startAppointment')).toBe(true);
    });

    it('debe fallar si startAppointment no es fecha ISO', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        startAppointment: 'fecha-invalida',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'startAppointment')).toBe(true);
    });
  });

  describe('endAppointment', () => {
    it('debe fallar si endAppointment está vacío', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        endAppointment: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'endAppointment')).toBe(true);
    });

    it('debe fallar si endAppointment no es fecha ISO', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        ...validData,
        endAppointment: '20-01-2026',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'endAppointment')).toBe(true);
    });
  });
});
