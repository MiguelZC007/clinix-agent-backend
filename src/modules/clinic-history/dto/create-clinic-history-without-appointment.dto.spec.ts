import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateClinicHistoryWithoutAppointmentDto } from './create-clinic-history-without-appointment.dto';

const baseData = {
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

describe('CreateClinicHistoryWithoutAppointmentDto', () => {
  it('debe pasar validación con patientId y specialtyId', async () => {
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      {
        ...baseData,
        patientId: '550e8400-e29b-41d4-a716-446655440001',
        specialtyId: '550e8400-e29b-41d4-a716-446655440002',
      },
    );
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe pasar validación con patientNumber y specialtyCode', async () => {
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      {
        ...baseData,
        patientNumber: 1,
        specialtyCode: 2,
      },
    );
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe fallar cuando se envían ambas parejas (patientId+specialtyId y patientNumber+specialtyCode)', async () => {
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      {
        ...baseData,
        patientId: '550e8400-e29b-41d4-a716-446655440001',
        specialtyId: '550e8400-e29b-41d4-a716-446655440002',
        patientNumber: 1,
        specialtyCode: 2,
      },
    );
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const message = errors
      .flatMap((e) => (e.constraints ? Object.values(e.constraints) : []))
      .join(' ');
    expect(message).toMatch(/patientId y specialtyId.*patientNumber y specialtyCode|no mezclar/);
  });

  it('debe fallar cuando no se envía ninguna pareja completa', async () => {
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      {
        ...baseData,
      },
    );
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe fallar cuando solo se envía patientId sin specialtyId', async () => {
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      {
        ...baseData,
        patientId: '550e8400-e29b-41d4-a716-446655440001',
      },
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'specialtyId' || e.property === 'patientId')).toBe(
      true,
    );
  });

  it('debe fallar cuando solo se envía patientNumber sin specialtyCode', async () => {
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      {
        ...baseData,
        patientNumber: 1,
      },
    );
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe fallar cuando patientNumber no es entero', async () => {
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      {
        ...baseData,
        patientNumber: 1.5,
        specialtyCode: 1,
      },
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'patientNumber')).toBe(true);
  });

  it('debe fallar cuando specialtyCode no es entero', async () => {
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      {
        ...baseData,
        patientNumber: 1,
        specialtyCode: 2.5,
      },
    );
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'specialtyCode')).toBe(true);
  });
});
