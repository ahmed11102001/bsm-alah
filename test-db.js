const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.test' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST
    }
  }
});

async function main() {
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`Attempt ${i + 1} connecting to ${process.env.DATABASE_URL_TEST}`);
      const user = await prisma.user.findFirst();
      console.log("Success! Found user:", user);
      break;
    } catch (e) {
      console.error(`Error on attempt ${i + 1}:`, e.message);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  await prisma.$disconnect();
}

main();
