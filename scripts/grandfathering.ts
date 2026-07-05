import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting grandfathering script...");

  // Find users with DEVELOPER plan
  const devUsers = await prisma.developerUser.findMany({
    where: { plan: "DEVELOPER" },
    select: { id: true, plan: true },
  });

  console.log(`Found ${devUsers.length} developer users with DEVELOPER plan.`);

  const userIds = devUsers.map(u => u.id);

  if (userIds.length > 0) {
    // Update all projects where ownerId is in the userIds list
    const updateResult = await prisma.developerProject.updateMany({
      where: { ownerId: { in: userIds } },
      data: { plan: "OWNER_PLAN" },
    });

    console.log(`Updated ${updateResult.count} owned projects to OWNER_PLAN.`);
    
    // Also update projects where developerId is in the list, just in case they don't have an ownerId
    // since the user said "حدث كل المشاريع بتاعتهم"
    const updateDevResult = await prisma.developerProject.updateMany({
      where: { 
        developerId: { in: userIds },
        ownerId: null // Only if they haven't been claimed
      },
      data: { plan: "OWNER_PLAN" },
    });
    
    console.log(`Updated ${updateDevResult.count} unclaimed projects to OWNER_PLAN.`);
  }

  console.log("Grandfathering finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
