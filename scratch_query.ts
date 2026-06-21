import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const accs = await prisma.whatsAppAccount.findMany();
  console.log('Accounts:', accs);
  
  // Also check if there are recent messages
  const msgs = await prisma.message.findMany({
    where: { direction: 'inbound' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent inbound messages:', msgs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
