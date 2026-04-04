import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const specialties = [
  'Cardiología',
  'Dermatología',
  'Endocrinología',
  'Gastroenterología',
  'Neurología',
  'Oncología',
  'Oftalmología',
  'Ortopedia',
  'Pediatría',
  'Psiquiatría',
];

const firstNames = [
  'María', 'José', 'Ana', 'Luis', 'Carmen', 'Juan', 'Laura', 'Carlos',
  'Patricia', 'Miguel', 'Sofía', 'Roberto', 'Isabel', 'Fernando', 'Elena',
  'Diego', 'Lucía', 'Antonio', 'Marta', 'Francisco', 'Andrea', 'Manuel',
  'Paula', 'Javier', 'Cristina', 'Álvaro', 'Natalia', 'Sergio', 'Raquel',
  'Pablo', 'Beatriz', 'David', 'Mónica', 'Jorge', 'Silvia', 'Rubén',
  'Teresa', 'Óscar', 'Inés', 'Víctor', 'Clara', 'Iván', 'Eva', 'Adrián',
  'Rosa', 'Eduardo', 'Alicia', 'Ricardo', 'Julia', 'Alberto', 'Diana',
];

const lastNames = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez',
  'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández',
  'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez',
  'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez',
  'Serrano', 'Blanco', 'Suárez', 'Molina', 'Morales', 'Ortega', 'Delgado',
  'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Núñez', 'Iglesias', 'Medina',
  'Garrido', 'Cortés', 'Castillo', 'Lozano', 'Guerrero', 'Cano', 'Prieto',
  'Méndez', 'Cruz', 'Calvo', 'Vidal', 'León', 'Herrera', 'Márquez',
];

const doctorFirstNames = [
  'Dr. Carlos', 'Dra. María', 'Dr. Javier', 'Dra. Ana', 'Dr. Luis',
  'Dra. Carmen', 'Dr. Roberto', 'Dra. Laura', 'Dr. Fernando', 'Dra. Patricia',
];

const doctorLastNames = [
  'Mendoza', 'Vargas', 'Silva', 'Morales', 'Herrera',
  'Castro', 'Ramos', 'Ortega', 'Delgado', 'Torres',
];

const allergies = [
  'Penicilina',
  'Sulfas',
  'Aspirina',
  'Ibuprofeno',
  'Polen',
  'Ácaros',
  'Maní',
  'Mariscos',
  'Lactosa',
  'Huevos',
  'Ninguna',
];

const medications = [
  'Metformina',
  'Losartán',
  'Atorvastatina',
  'Omeprazol',
  'Levotiroxina',
  'Amlodipino',
  'Metoprolol',
  'Furosemida',
  'Warfarina',
  'Insulina',
  'Ninguna',
];

const medicalHistory = [
  'Hipertensión',
  'Diabetes tipo 2',
  'Asma',
  'Artritis',
  'Osteoporosis',
  'Enfermedad cardíaca',
  'Colesterol alto',
  'Reflujo gastroesofágico',
  'Hipotiroidismo',
  'Ninguna',
];

const familyHistory = [
  'Diabetes',
  'Hipertensión',
  'Cáncer',
  'Enfermedad cardíaca',
  'Asma',
  'Artritis',
  'Alzheimer',
  'Ninguna',
];

const consultationReasons = [
  'Control de rutina',
  'Dolor de cabeza persistente',
  'Dolor en el pecho',
  'Dificultad para respirar',
  'Dolor abdominal',
  'Fiebre y malestar general',
  'Problemas de visión',
  'Dolor en las articulaciones',
  'Ansiedad y estrés',
  'Control de presión arterial',
  'Revisión de resultados de laboratorio',
  'Seguimiento de tratamiento',
];

const symptoms = [
  'Dolor de cabeza',
  'Fiebre',
  'Náuseas',
  'Mareos',
  'Fatiga',
  'Dolor en el pecho',
  'Dificultad para respirar',
  'Dolor abdominal',
  'Tos',
  'Dolor en las articulaciones',
  'Visión borrosa',
  'Ansiedad',
];

const diagnosticNames = [
  'Hipertensión arterial',
  'Diabetes mellitus tipo 2',
  'Resfriado común',
  'Gripe',
  'Gastritis',
  'Migraña',
  'Ansiedad generalizada',
  'Artritis reumatoide',
  'Asma bronquial',
  'Hipertiroidismo',
];

const physicalExamNames = [
  'Examen físico general',
  'Auscultación cardíaca',
  'Auscultación pulmonar',
  'Palpación abdominal',
  'Examen neurológico',
  'Examen oftalmológico',
  'Examen de articulaciones',
  'Medición de presión arterial',
];

const vitalSignNames = [
  'Presión arterial',
  'Temperatura',
  'Frecuencia cardíaca',
  'Frecuencia respiratoria',
  'Saturación de oxígeno',
  'Peso',
  'Altura',
  'Índice de masa corporal',
];

const medicationNames = [
  'Paracetamol',
  'Ibuprofeno',
  'Amoxicilina',
  'Omeprazol',
  'Losartán',
  'Metformina',
  'Atorvastatina',
  'Levotiroxina',
];

const TEST_DOCTOR_PHONES = ['+59160365521', '+59177484885'] as const;

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhone(): string {
  const areaCode = ['424', '414', '426', '416', '412'];
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `+58${getRandomElement(areaCode)}${number}`;
}

function normalizeForEmail(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '');
}

function generateEmail(name: string, lastName: string, index: number): string {
  const cleanName = normalizeForEmail(name);
  const cleanLastName = normalizeForEmail(lastName);
  return `${cleanName}.${cleanLastName}${index}@example.com`;
}

function generateBirthDate(): Date {
  const start = new Date(1950, 0, 1);
  const end = new Date(2010, 11, 31);
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

function generateAppointmentDate(baseDate: Date, daysOffset: number): Date {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + daysOffset);
  const hour = 8 + Math.floor(Math.random() * 10);
  const minute = Math.random() < 0.5 ? 0 : 30;
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getRandomElements<T>(array: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateAntecedents() {
  return {
    allergies: getRandomElements(allergies, 0, 3).filter(a => a !== 'Ninguna'),
    medications: getRandomElements(medications, 0, 3).filter(m => m !== 'Ninguna'),
    medicalHistory: getRandomElements(medicalHistory, 0, 2).filter(h => h !== 'Ninguna'),
    familyHistory: getRandomElements(familyHistory, 0, 3).filter(f => f !== 'Ninguna'),
  };
}

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  // ===========================================
  // TEST CREDENTIALS FOR E2E TESTING
  // See: clinix-frontend/e2e/TEST_CREDENTIALS.md
  // ===========================================
  
  const TEST_CREDENTIALS = {
    admin: {
      email: 'admin@clinix.com',
      phone: '+59170000001',
      password: 'Admin123!',
      role: 'ADMIN' as const,
    },
    doctor: {
      email: 'doctor.test@clinix.com',
      phone: '+59170000002',
      password: 'Doctor123!',
      role: 'DOCTOR' as const,
    },
    patient: {
      email: 'patient.test@clinix.com',
      phone: '+59170000003',
      password: 'Patient123!',
      role: 'PATIENT' as const,
    },
    e2e: {
      email: 'test-e2e@clinix.local',
      phone: '+59170000000',
      password: 'Test123!',
      role: 'DOCTOR' as const,
    },
  };

  const hashedPassword = await bcrypt.hash('password123', 10);
  const testPasswordHash = await bcrypt.hash(TEST_CREDENTIALS.e2e.password, 10);
  const adminPasswordHash = await bcrypt.hash(TEST_CREDENTIALS.admin.password, 10);
  const doctorPasswordHash = await bcrypt.hash(TEST_CREDENTIALS.doctor.password, 10);
  const patientPasswordHash = await bcrypt.hash(TEST_CREDENTIALS.patient.password, 10);

  console.log('📋 Creando especialidades...');
  const createdSpecialties = await Promise.all(
    specialties.map((name) =>
      prisma.specialty.create({
        data: { name },
      }),
    ),
  );
  console.log(`✅ ${createdSpecialties.length} especialidades creadas`);

  // ===========================================
  // E2E TEST USER (for Playwright tests)
  // ===========================================
  console.log('🔐 Creando usuario de prueba E2E...');
  const e2eUser = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.e2e.email },
    create: {
      email: TEST_CREDENTIALS.e2e.email,
      name: 'E2E',
      lastName: 'Test Doctor',
      phone: TEST_CREDENTIALS.e2e.phone,
      password: testPasswordHash,
      role: TEST_CREDENTIALS.e2e.role,
    },
    update: {
      phone: TEST_CREDENTIALS.e2e.phone,
      password: testPasswordHash,
    },
  });

  const existingE2EDoctor = await prisma.doctor.findFirst({
    where: { userId: e2eUser.id },
  });
  if (!existingE2EDoctor) {
    await prisma.doctor.create({
      data: {
        userId: e2eUser.id,
        specialtyId: createdSpecialties[0].id,
        licenseNumber: 'LIC-E2E-TEST',
      },
    });
  }
  console.log(`✅ Usuario E2E creado: ${TEST_CREDENTIALS.e2e.email}`);

  // ===========================================
  // ADMIN TEST USER (for admin tests)
  // ===========================================
  console.log('🔐 Creando usuario administrador de prueba...');
  const adminUser = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.admin.email },
    create: {
      email: TEST_CREDENTIALS.admin.email,
      name: 'Admin',
      lastName: 'Test',
      phone: TEST_CREDENTIALS.admin.phone,
      password: adminPasswordHash,
      role: TEST_CREDENTIALS.admin.role,
    },
    update: {
      phone: TEST_CREDENTIALS.admin.phone,
      password: adminPasswordHash,
    },
  });
  console.log(`✅ Usuario administrador creado: ${TEST_CREDENTIALS.admin.email}`);

  // ===========================================
  // DOCTOR TEST USER (for doctor tests)
  // ===========================================
  console.log('👨‍⚕️ Creando usuario doctor de prueba...');
  const doctorTestUser = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.doctor.email },
    create: {
      email: TEST_CREDENTIALS.doctor.email,
      name: 'Doctor',
      lastName: 'Test',
      phone: TEST_CREDENTIALS.doctor.phone,
      password: doctorPasswordHash,
      role: TEST_CREDENTIALS.doctor.role,
    },
    update: {
      phone: TEST_CREDENTIALS.doctor.phone,
      password: doctorPasswordHash,
    },
  });

  const existingDoctorTestDoctor = await prisma.doctor.findFirst({
    where: { userId: doctorTestUser.id },
  });
  if (!existingDoctorTestDoctor) {
    await prisma.doctor.create({
      data: {
        userId: doctorTestUser.id,
        specialtyId: createdSpecialties[1].id,
        licenseNumber: 'LIC-DOCTOR-TEST',
      },
    });
  }
  console.log(`✅ Usuario doctor creado: ${TEST_CREDENTIALS.doctor.email}`);

  // ===========================================
  // E2E TEST USER (for e2e tests)
  // ===========================================
  console.log('🧪 Creando usuario E2E de prueba...');
  const e2eTestUser = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.e2e.email },
    create: {
      email: TEST_CREDENTIALS.e2e.email,
      name: 'E2E',
      lastName: 'Test',
      phone: TEST_CREDENTIALS.e2e.phone,
      password: doctorPasswordHash,
      role: TEST_CREDENTIALS.e2e.role,
    },
    update: {
      phone: TEST_CREDENTIALS.e2e.phone,
      password: doctorPasswordHash,
    },
  });

  let e2eTestDoctor = await prisma.doctor.findFirst({
    where: { userId: e2eTestUser.id },
  });
  if (!e2eTestDoctor) {
    e2eTestDoctor = await prisma.doctor.create({
      data: {
        userId: e2eTestUser.id,
        specialtyId: createdSpecialties[2].id,
        licenseNumber: 'LIC-E2E-TEST',
      },
    });
  }
  console.log(`✅ Usuario E2E creado: ${TEST_CREDENTIALS.e2e.email}`);

  // ===========================================
  // PATIENT TEST USER (for patient tests)
  // ===========================================
  console.log('👤 Creando usuario paciente de prueba...');
  const patientTestUser = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.patient.email },
    create: {
      email: TEST_CREDENTIALS.patient.email,
      name: 'Patient',
      lastName: 'Test',
      phone: TEST_CREDENTIALS.patient.phone,
      password: patientPasswordHash,
      role: TEST_CREDENTIALS.patient.role,
    },
    update: {
      phone: TEST_CREDENTIALS.patient.phone,
      password: patientPasswordHash,
    },
  });
  console.log(`✅ Usuario paciente creado: ${TEST_CREDENTIALS.patient.email}`);

  // ===========================================
  // PRINT TEST CREDENTIALS
  // ===========================================
  console.log('\n📋 CREDENCIALES DE PRUEBA (ver clinix-frontend/e2e/TEST_CREDENTIALS.md):');
  console.log('   ─────────────────────────────────────');
  console.log(`   👤 ADMIN:`);
  console.log(`      Email: ${TEST_CREDENTIALS.admin.email}`);
  console.log(`      Phone: ${TEST_CREDENTIALS.admin.phone}`);
  console.log(`      Password: ${TEST_CREDENTIALS.admin.password}`);
  console.log(`   👨‍⚕️ DOCTOR:`);
  console.log(`      Email: ${TEST_CREDENTIALS.doctor.email}`);
  console.log(`      Phone: ${TEST_CREDENTIALS.doctor.phone}`);
  console.log(`      Password: ${TEST_CREDENTIALS.doctor.password}`);
  console.log(`   👤 PATIENT:`);
  console.log(`      Email: ${TEST_CREDENTIALS.patient.email}`);
  console.log(`      Phone: ${TEST_CREDENTIALS.patient.phone}`);
  console.log(`      Password: ${TEST_CREDENTIALS.patient.password}`);
  console.log(`   🧪 E2E TEST:`);
  console.log(`      Email: ${TEST_CREDENTIALS.e2e.email}`);
  console.log(`      Phone: ${TEST_CREDENTIALS.e2e.phone}`);
  console.log(`      Password: ${TEST_CREDENTIALS.e2e.password}`);
  console.log('   ─────────────────────────────────────\n');

  console.log('👨‍⚕️ Creando doctores...');
  const doctors: Array<{
    id: string;
    userId: string;
    specialtyId: string;
    licenseNumber: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  
  // Add test doctors first so they also get patients assigned
  const doctorTestDoctor = await prisma.doctor.findFirst({
    where: { user: { email: TEST_CREDENTIALS.doctor.email } },
  });
  if (doctorTestDoctor) {
    doctors.push(doctorTestDoctor);
  }
  
  if (e2eTestDoctor) {
    doctors.push(e2eTestDoctor);
  }
  
  for (let i = 0; i < 10; i++) {
    const firstName = doctorFirstNames[i];
    const lastName = doctorLastNames[i];
    const email = generateEmail(firstName, lastName, i);
    const phone = i < TEST_DOCTOR_PHONES.length ? TEST_DOCTOR_PHONES[i] : generatePhone();

    const user = await prisma.user.create({
      data: {
        email,
        name: firstName,
        lastName,
        phone,
        password: hashedPassword,
        role: 'DOCTOR',
      },
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        specialtyId: createdSpecialties[i].id,
        licenseNumber: `LIC-${String(i + 1).padStart(6, '0')}`,
      },
    });

    doctors.push(doctor);
  }
  console.log(`✅ ${doctors.length} doctores creados`);

  console.log('👥 Creando pacientes con antecedentes clínicos...');
  const patients: Array<{
    id: string;
    userId: string;
    gender: string | null;
    birthDate: Date | null;
    allergies: string[];
    medications: string[];
    medicalHistory: string[];
    familyHistory: string[];
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  for (let i = 0; i < 100; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const email = generateEmail(firstName, lastName, i);
    const phone = generatePhone();
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const birthDate = generateBirthDate();
    const antecedents = generateAntecedents();

    const user = await prisma.user.create({
      data: {
        email,
        name: firstName,
        lastName,
        phone,
        password: hashedPassword,
        role: 'PATIENT',
      },
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        registeredByDoctorId: doctors[i % doctors.length].id,
        gender,
        birthDate,
        allergies: antecedents.allergies,
        medications: antecedents.medications,
        medicalHistory: antecedents.medicalHistory,
        familyHistory: antecedents.familyHistory,
      },
    });

    patients.push(patient);
  }
  console.log(`✅ ${patients.length} pacientes creados con antecedentes clínicos`);

  console.log('📅 Creando citas (100 pacientes × 10 doctores = 1000 citas)...');
  const baseDate = new Date();
  const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  let appointmentCount = 0;
  const appointments: Array<{
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: Date;
    endAppointment: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (const patient of patients) {
    for (const doctor of doctors) {
      const daysOffset = Math.floor(Math.random() * 365);
      const startAppointment = generateAppointmentDate(baseDate, daysOffset);
      const endAppointment = new Date(startAppointment);
      endAppointment.setHours(endAppointment.getHours() + 1);

      const status = getRandomElement(statuses);

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          specialtyId: doctor.specialtyId,
          startAppointment,
          endAppointment,
          status,
        },
      });

      appointments.push(appointment);
      appointmentCount++;
      if (appointmentCount % 100 === 0) {
        console.log(`  ⏳ ${appointmentCount}/1000 citas creadas...`);
      }
    }
  }
  console.log(`✅ ${appointmentCount} citas creadas`);

  console.log('📋 Creando historias clínicas (1000 historias)...');
  let clinicHistoryCount = 0;

  for (const appointment of appointments) {
    const patient = patients.find(p => p.id === appointment.patientId);
    const doctor = doctors.find(d => d.id === appointment.doctorId);

    if (!patient || !doctor) continue;

    const consultationReason = getRandomElement(consultationReasons);
    const selectedSymptoms = getRandomElements(symptoms, 1, 4);
    const treatment = `Tratamiento prescrito según evaluación clínica. ${getRandomElement(['Reposo', 'Medicación', 'Terapia', 'Control'])} recomendado.`;

    const diagnosticName = getRandomElement(diagnosticNames);
    const diagnosticDescription = `Diagnóstico basado en síntomas y examen físico. ${diagnosticName} confirmado.`;

    const physicalExamName = getRandomElement(physicalExamNames);
    const physicalExamDescription = `Examen realizado: ${physicalExamName}. Resultados dentro de parámetros normales.`;

    const vitalSignsData = [
      {
        name: 'Presión arterial',
        value: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`,
        unit: 'mmHg',
        measurement: 'sistólica/diastólica',
        description: 'Presión arterial medida',
      },
      {
        name: 'Temperatura',
        value: (36.0 + Math.random() * 1.5).toFixed(1),
        unit: '°C',
        measurement: 'axilar',
        description: 'Temperatura corporal',
      },
      {
        name: 'Frecuencia cardíaca',
        value: String(60 + Math.floor(Math.random() * 40)),
        unit: 'lpm',
        measurement: 'radial',
        description: 'Pulso medido',
      },
    ];

    const hasPrescription = Math.random() > 0.3;
    const medicationCount = hasPrescription ? Math.floor(Math.random() * 2) + 1 : 0;

    const clinicHistory = await prisma.clinicHistory.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        specialtyId: doctor.specialtyId,
        appointmentId: appointment.id,
        consultationReason,
        symptoms: selectedSymptoms,
        treatment,
        diagnostics: {
          create: {
            name: diagnosticName,
            description: diagnosticDescription,
          },
        },
        physicalExams: {
          create: {
            name: physicalExamName,
            description: physicalExamDescription,
          },
        },
        vitalSigns: {
          create: vitalSignsData,
        },
        ...(hasPrescription && medicationCount > 0
          ? {
            prescription: {
              create: {
                name: `Receta médica - ${consultationReason}`,
                description: 'Medicamentos prescritos según diagnóstico',
                prescriptionMedications: {
                  create: Array.from({ length: medicationCount }, () => {
                    const medName = getRandomElement(medicationNames);
                    return {
                      name: medName,
                      quantity: Math.floor(Math.random() * 20) + 10,
                      unit: 'tabletas',
                      frequency: getRandomElement(['Cada 8 horas', 'Cada 12 horas', 'Una vez al día', 'Cada 6 horas']),
                      duration: `${Math.floor(Math.random() * 7) + 3} días`,
                      indications: 'Tomar con alimentos',
                      administrationRoute: 'Oral',
                      description: `Medicamento: ${medName}`,
                    };
                  }),
                },
              },
            },
          }
          : {}),
      },
    });

    clinicHistoryCount++;
    if (clinicHistoryCount % 100 === 0) {
      console.log(`  ⏳ ${clinicHistoryCount}/1000 historias clínicas creadas...`);
    }
  }
  console.log(`✅ ${clinicHistoryCount} historias clínicas creadas`);

  console.log('✨ Seed completado exitosamente!');
  console.log(`📊 Resumen:`);
  console.log(`   - ${createdSpecialties.length} especialidades`);
  console.log(`   - ${doctors.length} doctores`);
  console.log(`   - ${patients.length} pacientes (con antecedentes clínicos)`);
  console.log(`   - ${appointmentCount} citas`);
  console.log(`   - ${clinicHistoryCount} historias clínicas`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
