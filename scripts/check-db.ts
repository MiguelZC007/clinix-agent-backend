import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...');
    
    const patientCount = await prisma.patient.count();
    const userCount = await prisma.user.count();
    const doctorCount = await prisma.doctor.count();
    const appointmentCount = await prisma.appointment.count();
    
    console.log('📊 Database counts:');
    console.log('  Users:', userCount);
    console.log('  Patients:', patientCount);
    console.log('  Doctors:', doctorCount);
    console.log('  Appointments:', appointmentCount);
    
    if (patientCount === 0) {
      console.log('❌ No patients found! Please run: npx tsx prisma/seed.ts');
      process.exit(1);
    } else {
      console.log('✅ Database has data');
      
      // Show first 3 patients
      const patients = await prisma.patient.findMany({
        take: 3,
        include: { user: true }
      });
      
      console.log('\n📋 Sample patients:');
      patients.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.user.name} ${p.user.lastName} (${p.user.email})`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();