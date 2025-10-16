const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Database connected:', result);
}

main()
  .catch(e => console.error('❌ Error:', e))
  .finally(() => prisma.$disconnect());