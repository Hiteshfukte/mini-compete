import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.registration.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create organizer
  const organizer = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@organizer.com',
      password: hashedPassword,
      role: Role.ORGANIZER,
    },
  });

  // Create participant
  const participant = await prisma.user.create({
    data: {
      name: 'Charlie Brown',
      email: 'charlie@participant.com',
      password: hashedPassword,
      role: Role.PARTICIPANT,
    },
  });

  // Create competition
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  await prisma.competition.create({
    data: {
      title: 'Hackathon 2025',
      description: 'Build the next big thing in 48 hours!',
      tags: ['coding', 'hackathon'],
      capacity: 100,
      regDeadline: nextWeek,
      createdById: organizer.id,
    },
  });

  console.log('✅ Seeding complete!');
  console.log('🔑 Test login: alice@organizer.com / password123');
  console.log('🔑 Test login: charlie@participant.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });