import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePatientDto } from './create-patient.dto';
import { Gender } from 'src/core/enum/gender.enum';

describe('CreatePatientDto', () => {
  const validData = {
    email: 'test@ejemplo.com',
    name: 'Juan',
    lastName: 'Pérez',
    phone: '+584241234567',
    address: 'Calle 123',
  };

  it('debe pasar validación con datos válidos', async () => {
    const dto = plainToInstance(CreatePatientDto, validData);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe pasar validación con todos los campos opcionales', async () => {
    const dto = plainToInstance(CreatePatientDto, {
      ...validData,
      password: 'password123',
      gender: Gender.MALE,
      birthDate: '1990-05-15',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('address', () => {
    it('debe fallar si address está vacío', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        address: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'address')).toBe(true);
    });

    it('debe fallar si address tiene menos de 5 caracteres', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        address: '1234',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'address')).toBe(true);
    });
  });

  describe('email', () => {
    it('debe fallar si email está vacío', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        email: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('debe fallar si email tiene formato inválido', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        email: 'email-invalido',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('debe fallar si email excede 255 caracteres', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        email: 'a'.repeat(250) + '@test.com',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
  });

  describe('name', () => {
    it('debe fallar si nombre está vacío', async () => {
      const dto = plainToInstance(CreatePatientDto, { ...validData, name: '' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('debe fallar si nombre tiene menos de 2 caracteres', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        name: 'A',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('debe fallar si nombre excede 100 caracteres', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        name: 'A'.repeat(101),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });
  });

  describe('lastName', () => {
    it('debe fallar si apellido está vacío', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        lastName: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'lastName')).toBe(true);
    });

    it('debe fallar si apellido tiene menos de 2 caracteres', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        lastName: 'A',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'lastName')).toBe(true);
    });
  });

  describe('phone', () => {
    it('debe fallar si teléfono está vacío', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        phone: '',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'phone')).toBe(true);
    });

    it('debe fallar si teléfono tiene formato inválido', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        phone: 'telefono-invalido',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'phone')).toBe(true);
    });

    it('debe aceptar teléfono con formato internacional', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        phone: '+14155552671',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('password', () => {
    it('debe fallar si password tiene menos de 6 caracteres', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        password: '12345',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('debe aceptar password con 6 o más caracteres', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        password: '123456',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('gender', () => {
    it('debe fallar si gender tiene valor inválido', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        gender: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'gender')).toBe(true);
    });

    it('debe aceptar gender male', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        gender: Gender.MALE,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debe aceptar gender female', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        gender: Gender.FEMALE,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('birthDate', () => {
    it('debe fallar si birthDate tiene formato inválido', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        birthDate: 'fecha-invalida',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'birthDate')).toBe(true);
    });

    it('debe aceptar birthDate en formato ISO', async () => {
      const dto = plainToInstance(CreatePatientDto, {
        ...validData,
        birthDate: '1990-05-15',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
