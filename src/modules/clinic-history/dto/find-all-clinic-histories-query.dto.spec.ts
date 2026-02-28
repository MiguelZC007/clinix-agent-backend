import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FindAllClinicHistoriesQueryDto } from './find-all-clinic-histories-query.dto';

describe('FindAllClinicHistoriesQueryDto', () => {
  it('debe pasar validación sin filtros (solo paginación)', async () => {
    const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
      page: 1,
      pageSize: 10,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe pasar validación sin query (todos opcionales)', async () => {
    const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('search', () => {
    it('debe aceptar search con longitud válida', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        search: 'dolor',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.search).toBe('dolor');
    });

    it('debe rechazar search con más de 200 caracteres', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        search: 'a'.repeat(201),
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'search')).toBe(true);
    });

    it('debe transformar search con trim', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        search: '  texto  ',
      });
      await validate(dto);
      expect(dto.search).toBe('texto');
    });
  });

  describe('patientId', () => {
    it('debe aceptar patientId UUID válido', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        patientId: '123e4567-e89b-12d3-a456-426614174000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debe rechazar patientId que no es UUID', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        patientId: 'not-a-uuid',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'patientId')).toBe(true);
    });
  });

  describe('dateFrom / dateTo', () => {
    it('debe aceptar dateFrom ISO válido', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        dateFrom: '2026-01-01',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debe aceptar dateTo ISO válido', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        dateTo: '2026-12-31',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('debe rechazar dateFrom con formato inválido', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        dateFrom: '31/01/2026',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'dateFrom')).toBe(true);
    });

    it('debe rechazar dateTo con formato inválido', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        dateTo: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'dateTo')).toBe(true);
    });
  });

  describe('page / pageSize', () => {
    it('debe rechazar page menor a 1', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        page: 0,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('debe rechazar pageSize mayor a 100', async () => {
      const dto = plainToInstance(FindAllClinicHistoriesQueryDto, {
        pageSize: 101,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'pageSize')).toBe(true);
    });
  });
});
