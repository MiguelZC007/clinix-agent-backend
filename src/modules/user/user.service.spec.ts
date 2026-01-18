import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create', () => {
    it('debe retornar mensaje de creación', () => {
      const dto: CreateUserDto = {};
      expect(service.create(dto)).toBe('This action adds a new user');
    });
  });

  describe('findAll', () => {
    it('debe retornar mensaje de listado', () => {
      expect(service.findAll()).toBe('This action returns all user');
    });
  });

  describe('findOne', () => {
    it('debe retornar mensaje con ID', () => {
      expect(service.findOne(1)).toBe('This action returns a #1 user');
    });
  });

  describe('update', () => {
    it('debe retornar mensaje de actualización con ID', () => {
      const dto: UpdateUserDto = {};
      expect(service.update(1, dto)).toBe('This action updates a #1 user');
    });
  });

  describe('remove', () => {
    it('debe retornar mensaje de eliminación con ID', () => {
      expect(service.remove(1)).toBe('This action removes a #1 user');
    });
  });
});
