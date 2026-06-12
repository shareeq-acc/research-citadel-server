import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://danish:root@localhost:5432/hackathon?schema=public',
  }),
});

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('🎉 Database seed completed (auth/user/storage only - no data to seed).');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
