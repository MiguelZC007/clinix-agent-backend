import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UserController', () => {
  let controller: UserController;
  type MockUserService = {
    create: jest.MockedFunction<(this: void, dto: CreateUserDto) => string>;
    findAll: jest.MockedFunction<(this: void) => string>;
    findOne: jest.MockedFunction<(this: void, id: number) => string>;
    update: jest.MockedFunction<
      (this: void, id: number, dto: UpdateUserDto) => string
    >;
    remove: jest.MockedFunction<(this: void, id: number) => string>;
  };
  let service: MockUserService;

  beforeEach(async () => {
    const mockService: MockUserService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService);
  });

  describe('create', () => {
    it('debe llamar a userService.create', () => {
      const dto: CreateUserDto = {};
      service.create.mockReturnValue('created');

      const result = controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe('created');
    });
  });

  describe('findAll', () => {
    it('debe llamar a userService.findAll', () => {
      service.findAll.mockReturnValue('all users');

      const result = controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBe('all users');
    });
  });

  describe('findOne', () => {
    it('debe llamar a userService.findOne con ID numérico', () => {
      service.findOne.mockReturnValue('user 1');

      const result = controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toBe('user 1');
    });
  });

  describe('update', () => {
    it('debe llamar a userService.update con ID y DTO', () => {
      const dto: UpdateUserDto = {};
      service.update.mockReturnValue('updated');

      const result = controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toBe('updated');
    });
  });

  describe('remove', () => {
    it('debe llamar a userService.remove con ID', () => {
      service.remove.mockReturnValue('removed');

      const result = controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toBe('removed');
    });
  });
});
