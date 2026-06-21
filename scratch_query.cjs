const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accs = await prisma.whatsAppAccount.findMany();
  console.log('Accounts:', accs);
  
  const msgs = await prisma.message.findMany({
    where: { direction: 'inbound' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent inbound messages:', msgs);

  const logs = await prisma.webhookLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent WebhookLogs:', logs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
