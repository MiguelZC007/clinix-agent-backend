import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePatientAntecedentsDto } from './update-patient-antecedents.dto';

describe('UpdatePatientAntecedentsDto', () => {
  it('debe pasar validación con objeto vacío (todos opcionales)', async () => {
    const dto = plainToInstance(UpdatePatientAntecedentsDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe pasar validación con datos válidos', async () => {
    const dto = plainToInstance(UpdatePatientAntecedentsDto, {
      allergies: ['penicilina', 'maní'],
      medications: ['aspirina'],
      medicalHistory: ['diabetes'],
      familyHistory: ['hipertensión'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('allergies', () => {
    it('debe aceptar array vacío', async () => {
      const dto = plainToInstance(UpdatePatientAntecedentsDto, {
        allergies: [],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debe fallar si allergies tiene más de 50 elementos', async () => {
      const dto = plainToInstance(UpdatePatientAntecedentsDto, {
        allergies: Array(51).fill('alergia'),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'allergies')).toBe(true);
    });

    it('debe fallar si allergies contiene elementos no string', async () => {
      const dto = plainToInstance(UpdatePatientAntecedentsDto, {
        allergies: [123, 'alergia'],
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'allergies')).toBe(true);
    });
  });

  describe('medications', () => {
    it('debe fallar si medications tiene más de 50 elementos', async () => {
      const dto = plainToInstance(UpdatePatientAntecedentsDto, {
        medications: Array(51).fill('medicamento'),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'medications')).toBe(true);
    });
  });

  describe('medicalHistory', () => {
    it('debe fallar si medicalHistory tiene más de 100 elementos', async () => {
      const dto = plainToInstance(UpdatePatientAntecedentsDto, {
        medicalHistory: Array(101).fill('condición'),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'medicalHistory')).toBe(true);
    });
  });

  describe('familyHistory', () => {
    it('debe fallar si familyHistory tiene más de 100 elementos', async () => {
      const dto = plainToInstance(UpdatePatientAntecedentsDto, {
        familyHistory: Array(101).fill('condición'),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'familyHistory')).toBe(true);
    });
  });
});
