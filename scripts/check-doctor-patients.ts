import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function checkDoctorPatients() {
  try {
    // Find the test doctor
    const doctorUser = await prisma.user.findUnique({
      where: { email: 'doctor.test@clinix.com' },
      include: { doctor: true }
    });
    
    if (!doctorUser || !doctorUser.doctor) {
      console.log('❌ Test doctor not found');
      return;
    }
    
    console.log('👨‍⚕️ Test doctor:', doctorUser.name, doctorUser.lastName);
    console.log('   Doctor ID:', doctorUser.doctor.id);
    
    // Count patients registered by this doctor
    const patientCount = await prisma.patient.count({
      where: { registeredByDoctorId: doctorUser.doctor.id }
    });
    
    console.log('   Registered patients:', patientCount);
    
    if (patientCount === 0) {
      console.log('\n⚠️  This doctor has NO patients!');
      console.log('   The seed assigns patients randomly to doctors.');
      console.log('   Need to ensure test doctors have patients assigned.');
    }
    
    // Show all doctors and their patient counts
    console.log('\n📊 All doctors patient counts:');
    const doctors = await prisma.doctor.findMany({
      include: { user: true }
    });
    
    for (const doctor of doctors) {
      const count = await prisma.patient.count({
        where: { registeredByDoctorId: doctor.id }
      });
      console.log(`   ${doctor.user.name} ${doctor.user.lastName}: ${count} patients`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDoctorPatients();