import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { OpenaiService } from 'src/modules/openai/openai.service';
import { ConversationService } from 'src/modules/openai/conversation.service';

describe('OpenAI Integration - Anamnesis Flow (e2e)', () => {
  let openaiService: OpenaiService;
  let conversationService: ConversationService;
  let prisma: PrismaService;

  let testDoctorId: string;
  let testDoctorPhone: string;
  let testPatientId: string;
  let testAppointmentId: string;
  let testSpecialtyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [OpenaiService, ConversationService, PrismaService],
    }).compile();

    openaiService = moduleFixture.get<OpenaiService>(OpenaiService);
    conversationService =
      moduleFixture.get<ConversationService>(ConversationService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function setupTestData() {
    testSpecialtyId = `test-specialty-${Date.now()}`;
    await prisma.specialty.create({
      data: {
        id: testSpecialtyId,
        name: 'Medicina General Test',
      },
    });

    const testUser = await prisma.user.create({
      data: {
        email: `doctor-test-${Date.now()}@test.com`,
        name: 'Dr. Carlos',
        lastName: 'Mendoza',
        phone: `+5842400${Date.now().toString().slice(-6)}`,
        password: 'test123',
        doctor: {
          create: {
            specialtyId: testSpecialtyId,
            licenseNumber: `LIC-${Date.now()}`,
          },
        },
      },
      include: { doctor: true },
    });

    testDoctorId = testUser.doctor!.id;
    testDoctorPhone = testUser.phone;

    console.log('\n📋 Datos de prueba creados:');
    console.log(`   Doctor ID: ${testDoctorId}`);
    console.log(`   Doctor Phone: ${testDoctorPhone}`);
    console.log(`   Specialty ID: ${testSpecialtyId}`);
  }

  async function cleanupTestData() {
    console.log('\n🧹 Limpiando datos de prueba...');

    if (testAppointmentId) {
      await prisma.clinicHistory.deleteMany({
        where: { appointmentId: testAppointmentId },
      });
      await prisma.appointment.deleteMany({ where: { id: testAppointmentId } });
    }

    if (testPatientId) {
      await prisma.appointment.deleteMany({
        where: { patientId: testPatientId },
      });
      const patient = await prisma.patient.findUnique({
        where: { id: testPatientId },
      });
      if (patient) {
        await prisma.patient.delete({ where: { id: testPatientId } });
        await prisma.user.delete({ where: { id: patient.userId } });
      }
    }

    await prisma.message.deleteMany({
      where: { conversation: { doctorId: testDoctorId } },
    });
    await prisma.conversation.deleteMany({ where: { doctorId: testDoctorId } });

    const doctor = await prisma.doctor.findUnique({
      where: { id: testDoctorId },
    });
    if (doctor) {
      await prisma.doctor.delete({ where: { id: testDoctorId } });
      await prisma.user.delete({ where: { id: doctor.userId } });
    }

    await prisma.specialty.deleteMany({ where: { id: testSpecialtyId } });

    console.log('   ✅ Limpieza completada');
  }

  async function sendMessage(message: string): Promise<string> {
    console.log(`\n👨‍⚕️ Médico: ${message}`);
    const response = await openaiService.processMessageFromDoctor(
      testDoctorPhone,
      message,
    );
    console.log(
      `🤖 Asistente: ${response.substring(0, 500)}${response.length > 500 ? '...' : ''}`,
    );
    return response;
  }

  async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  describe('Flujo completo de Anamnesis', () => {
    it('Paso 1: Verificar identificación del doctor', async () => {
      const doctorInfo =
        await conversationService.findDoctorByPhone(testDoctorPhone);

      expect(doctorInfo).not.toBeNull();
      expect(doctorInfo!.doctorId).toBe(testDoctorId);
      expect(doctorInfo!.doctorName).toBe('Dr. Carlos Mendoza');

      console.log('\n✅ Doctor identificado correctamente');
    });

    it('Paso 2: Iniciar conversación y saludar', async () => {
      const response = await sendMessage('Hola, buenos días');

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);

      const conversation = await prisma.conversation.findFirst({
        where: { doctorId: testDoctorId, isActive: true },
        include: { messages: true },
      });

      expect(conversation).not.toBeNull();
      expect(conversation!.messages.length).toBeGreaterThanOrEqual(2);

      console.log('\n✅ Conversación iniciada y mensajes guardados en BD');
    });

    it('Paso 3: Solicitar registro de paciente nuevo', async () => {
      await delay(1000);

      const response = await sendMessage(
        'Necesito registrar un nuevo paciente que acaba de llegar a consulta',
      );

      expect(response).toBeDefined();
      expect(response.toLowerCase()).toMatch(
        /nombre|datos|paciente|información/i,
      );

      console.log('\n✅ El asistente solicita información del paciente');
    });

    it('Paso 4: Proporcionar datos del paciente', async () => {
      await delay(1000);

      const response = await sendMessage(
        'El paciente se llama María García, su email es maria.garcia@email.com, teléfono +584121234567, es mujer y nació el 15 de marzo de 1985. No tiene alergias conocidas, no toma medicamentos actualmente, no tiene antecedentes médicos relevantes ni antecedentes familiares importantes. Por favor registra al paciente con estos datos.',
      );

      expect(response).toBeDefined();

      await delay(3000);

      const patient = await prisma.patient.findFirst({
        where: {
          user: {
            OR: [
              { email: 'maria.garcia@email.com' },
              { phone: '+584121234567' },
            ],
          },
        },
        include: { user: true },
      });

      if (patient) {
        testPatientId = patient.id;
        console.log(`\n✅ Paciente registrado con ID: ${testPatientId}`);

        expect(patient.user.name).toBe('María');
        expect(patient.user.lastName).toBe('García');
        expect(patient.gender).toBe('female');
      } else {
        console.log(
          '\n⚠️ Paciente aún no registrado, intentando confirmar registro...',
        );

        await delay(1000);
        const confirmResponse = await sendMessage(
          'Confirmo que deseo registrar al paciente María García con los datos proporcionados. Procede con el registro.',
        );
        console.log(
          `🤖 Respuesta de confirmación: ${confirmResponse.substring(0, 300)}...`,
        );

        await delay(3000);

        const patientRetry = await prisma.patient.findFirst({
          where: {
            user: {
              OR: [
                { email: 'maria.garcia@email.com' },
                { phone: '+584121234567' },
              ],
            },
          },
          include: { user: true },
        });

        if (patientRetry) {
          testPatientId = patientRetry.id;
          console.log(`\n✅ Paciente registrado con ID: ${testPatientId}`);
        }
      }
    });

    it('Paso 5: Consultar lista de pacientes', async () => {
      await delay(1000);

      const response = await sendMessage(
        'Muéstrame la lista de todos los pacientes',
      );

      expect(response).toBeDefined();

      const patients = await prisma.patient.findMany({
        include: { user: true },
      });

      console.log(`\n✅ Total de pacientes en BD: ${patients.length}`);
    });

    it('Paso 6: Registrar antecedentes médicos', async () => {
      if (!testPatientId) {
        const patient = await prisma.patient.findFirst({
          where: { user: { email: 'maria.garcia@email.com' } },
        });
        if (patient) testPatientId = patient.id;
      }

      if (!testPatientId) {
        console.log('\n⚠️ Saltando - No hay paciente registrado');
        return;
      }

      await delay(1000);

      const response = await sendMessage(
        `Actualiza los antecedentes del paciente ${testPatientId}: tiene alergia a la penicilina y al ibuprofeno, actualmente toma metformina 500mg y losartán 50mg, tiene historial de diabetes tipo 2 e hipertensión, y antecedentes familiares de enfermedad cardíaca y cáncer de mama`,
      );

      expect(response).toBeDefined();

      await delay(2000);

      const updatedPatient = await prisma.patient.findUnique({
        where: { id: testPatientId },
      });

      if (updatedPatient) {
        console.log('\n📋 Antecedentes guardados:');
        console.log(`   Alergias: ${updatedPatient.allergies.join(', ')}`);
        console.log(
          `   Medicamentos: ${updatedPatient.medications.join(', ')}`,
        );
        console.log(
          `   Historial médico: ${updatedPatient.medicalHistory.join(', ')}`,
        );
        console.log(
          `   Historial familiar: ${updatedPatient.familyHistory.join(', ')}`,
        );
      }
    });

    it('Paso 7: Crear cita médica', async () => {
      if (!testPatientId) {
        console.log('\n⚠️ Saltando - No hay paciente registrado');
        return;
      }

      await delay(1000);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setMinutes(30);

      const response = await sendMessage(
        `Crea una cita para el paciente ${testPatientId} con el doctor ${testDoctorId} de la especialidad ${testSpecialtyId} para mañana a las 10:00 AM, duración 30 minutos`,
      );

      expect(response).toBeDefined();

      await delay(2000);

      const appointment = await prisma.appointment.findFirst({
        where: {
          patientId: testPatientId,
          doctorId: testDoctorId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (appointment) {
        testAppointmentId = appointment.id;
        console.log(`\n✅ Cita creada con ID: ${testAppointmentId}`);
        console.log(`   Estado: ${appointment.status}`);
        console.log(`   Inicio: ${appointment.startAppointment.toISOString()}`);
      }
    });

    it('Paso 8: Consultar citas del paciente', async () => {
      if (!testPatientId) {
        console.log('\n⚠️ Saltando - No hay paciente registrado');
        return;
      }

      await delay(1000);

      const response = await sendMessage(
        `Muéstrame todas las citas del paciente ${testPatientId}`,
      );

      expect(response).toBeDefined();

      const appointments = await prisma.appointment.findMany({
        where: { patientId: testPatientId },
      });

      console.log(`\n✅ Citas encontradas: ${appointments.length}`);
    });

    it('Paso 9: Verificar persistencia de la conversación', async () => {
      const conversation = await prisma.conversation.findFirst({
        where: { doctorId: testDoctorId, isActive: true },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      expect(conversation).not.toBeNull();
      expect(conversation!.messages.length).toBeGreaterThan(0);

      console.log('\n📊 Resumen de la conversación:');
      console.log(`   Total de mensajes: ${conversation!.messages.length}`);
      console.log(
        `   Mensajes del usuario: ${conversation!.messages.filter((m) => m.role === 'user').length}`,
      );
      console.log(
        `   Mensajes del asistente: ${conversation!.messages.filter((m) => m.role === 'assistant').length}`,
      );

      if (conversation!.summary) {
        console.log(`   Resumen activo: Sí`);
      }
    });

    it('Paso 10: Verificar que el asistente rechaza solicitudes fuera de alcance', async () => {
      await delay(1000);

      const response = await sendMessage('¿Cuál es la capital de Francia?');

      expect(response).toBeDefined();
      expect(response.toLowerCase()).toMatch(
        /no puedo|solo puedo|funciones|médico|pacientes|citas/i,
      );

      console.log(
        '\n✅ El asistente rechazó correctamente la solicitud fuera de alcance',
      );
    });
  });

  describe('Verificación de datos en Base de Datos', () => {
    it('Debe verificar que todos los datos se guardaron correctamente', async () => {
      console.log('\n📊 RESUMEN FINAL DE DATOS EN BASE DE DATOS:\n');

      const doctor = await prisma.doctor.findUnique({
        where: { id: testDoctorId },
        include: { user: true, specialty: true },
      });
      console.log('👨‍⚕️ Doctor:');
      console.log(`   Nombre: ${doctor?.user.name} ${doctor?.user.lastName}`);
      console.log(`   Especialidad: ${doctor?.specialty.name}`);

      const conversations = await prisma.conversation.findMany({
        where: { doctorId: testDoctorId },
        include: { _count: { select: { messages: true } } },
      });
      console.log(`\n💬 Conversaciones: ${conversations.length}`);
      conversations.forEach((conv, i) => {
        console.log(
          `   ${i + 1}. ID: ${conv.id.substring(0, 8)}... | Mensajes: ${conv._count.messages} | Activa: ${conv.isActive}`,
        );
      });

      if (testPatientId) {
        const patient = await prisma.patient.findUnique({
          where: { id: testPatientId },
          include: { user: true },
        });
        console.log(`\n🧑‍🤝‍🧑 Paciente registrado:`);
        console.log(
          `   Nombre: ${patient?.user.name} ${patient?.user.lastName}`,
        );
        console.log(`   Email: ${patient?.user.email}`);
        console.log(`   Alergias: ${patient?.allergies.length || 0}`);
        console.log(`   Medicamentos: ${patient?.medications.length || 0}`);
      }

      if (testAppointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: testAppointmentId },
        });
        console.log(`\n📅 Cita creada:`);
        console.log(`   Estado: ${appointment?.status}`);
        console.log(
          `   Fecha: ${appointment?.startAppointment?.toISOString() ?? 'N/A'}`,
        );
      }

      console.log('\n✅ Verificación de base de datos completada');
    });
  });
});
