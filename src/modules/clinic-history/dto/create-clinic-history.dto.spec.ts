import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateClinicHistoryDto } from './create-clinic-history.dto';

describe('CreateClinicHistoryDto', () => {
  const validData = {
    appointmentId: '550e8400-e29b-41d4-a716-446655440003',
    consultationReason: 'Dolor de cabeza persistente desde hace 3 días',
    symptoms: ['dolor de cabeza', 'mareos'],
    treatment: 'Reposo, hidratación y medicamento para el dolor',
    diagnostics: [{ name: 'Migraña', description: 'Cefalea tensional' }],
    physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
    vitalSigns: [
      {
        name: 'Presión arterial',
        value: '120/80',
        unit: 'mmHg',
        measurement: 'sistólica/diastólica',
      },
    ],
  };

  it('debe pasar validación con datos válidos', async () => {
    const dto = plainToInstance(CreateClinicHistoryDto, validData);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe pasar validación con prescripción opcional', async () => {
    const dto = plainToInstance(CreateClinicHistoryDto, {
      ...validData,
      prescription: {
        name: 'Receta',
        description: 'Tratamiento',
        medications: [
          {
            name: 'Paracetamol',
            quantity: 20,
            unit: 'tabletas',
            frequency: 'Cada 8 horas',
            duration: '5 días',
            indications: 'Tomar con alimentos',
            administrationRoute: 'Oral',
          },
        ],
      },
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('appointmentId', () => {
    it('debe fallar si appointmentId está vacío', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        appointmentId: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'appointmentId')).toBe(true);
    });

    it('debe fallar si appointmentId no es UUID', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        appointmentId: 'invalid-uuid',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'appointmentId')).toBe(true);
    });
  });

  describe('consultationReason', () => {
    it('debe fallar si consultationReason está vacío', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        consultationReason: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'consultationReason')).toBe(
        true,
      );
    });

    it('debe fallar si consultationReason tiene menos de 10 caracteres', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        consultationReason: 'Corto',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'consultationReason')).toBe(
        true,
      );
    });

    it('debe aceptar el alias reason cuando consultationReason no está presente', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        reason: 'Dolor de cabeza persistente desde hace 3 días',
        consultationReason: undefined,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.consultationReason).toBe(
        'Dolor de cabeza persistente desde hace 3 días',
      );
    });

    it('debe fallar si consultationReason excede 1000 caracteres', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        consultationReason: 'A'.repeat(1001),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'consultationReason')).toBe(
        true,
      );
    });
  });

  describe('symptoms', () => {
    it('debe fallar si symptoms está vacío', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        symptoms: [],
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'symptoms')).toBe(true);
    });

    it('debe fallar si symptoms tiene más de 50 elementos', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        symptoms: Array(51).fill('síntoma'),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'symptoms')).toBe(true);
    });

    it('debe fallar si symptoms contiene elementos no string', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        symptoms: [123, 'dolor'],
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'symptoms')).toBe(true);
    });

    it('debe transformar un string en arreglo de symptoms', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        symptoms: 'dolor de cabeza',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.symptoms).toEqual(['dolor de cabeza']);
    });
  });

  describe('treatment', () => {
    it('debe fallar si treatment tiene menos de 10 caracteres', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        treatment: 'Corto',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'treatment')).toBe(true);
    });

    it('debe fallar si treatment excede 2000 caracteres', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        treatment: 'A'.repeat(2001),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'treatment')).toBe(true);
    });
  });

  describe('diagnostics', () => {
    it('debe fallar si diagnostics tiene más de 20 elementos', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        diagnostics: Array(21).fill({
          name: 'Diagnóstico',
          description: 'Desc',
        }),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'diagnostics')).toBe(true);
    });
  });

  describe('nested diagnostics validation', () => {
    it('debe fallar si diagnóstico tiene nombre vacío', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        diagnostics: [{ name: '', description: 'Descripción' }],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('debe fallar si diagnóstico tiene descripción vacía', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        diagnostics: [{ name: 'Nombre', description: '' }],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('nested vitalSigns validation', () => {
    it('debe fallar si signo vital tiene campos vacíos', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        vitalSigns: [{ name: '', value: '', unit: '', measurement: '' }],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('nested prescription validation', () => {
    it('debe fallar si prescripción no tiene medicamentos', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        prescription: {
          name: 'Receta',
          description: 'Tratamiento',
          medications: [],
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('debe fallar si medicamento tiene cantidad inválida', async () => {
      const dto = plainToInstance(CreateClinicHistoryDto, {
        ...validData,
        prescription: {
          name: 'Receta',
          description: 'Tratamiento',
          medications: [
            {
              name: 'Med',
              quantity: 0,
              unit: 'tab',
              frequency: 'freq',
              duration: 'dur',
              indications: 'ind',
              administrationRoute: 'oral',
            },
          ],
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
