export const createMockPrismaService = () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  doctor: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  specialty: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  appointment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  clinicHistory: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  diagnostic: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
  physicalExam: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
  vitalSign: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
  prescription: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  prescriptionMedication: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
  revokedToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  auditLog: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(async (operations: unknown) => {
    // Handle both callback form ($transaction(async (tx) => ...)) and array form
    if (typeof operations === 'function') {
      // Callback form - pass a mock tx that delegates to the prisma mock
      const tx = {
        user: {
          findFirst: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          create: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(args[0]?.data),
            ),
          findUnique: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
        },
        patient: {
          findFirst: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          findUnique: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          update: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(args[0]?.data),
            ),
        },
        appointment: {
          findUnique: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          findFirst: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          findByIdentifier: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          create: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(args[0]?.data),
            ),
        },
        clinicHistory: {
          create: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(args[0]?.data),
            ),
        },
        specialty: {
          findUnique: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          findFirst: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
        },
        doctor: {
          findUnique: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          findFirst: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(undefined),
            ),
          create: jest
            .fn()
            .mockImplementation(
              async (...args) => await Promise.resolve(args[0]?.data),
            ),
        },
      };
      return operations(tx);
    }
    // Array form - just return Promise.all(operations)
    if (Array.isArray(operations)) {
      return Promise.all(operations);
    }
    return operations;
  }),
});

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;
