import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting grandfathering script...");

  // Find projects that still use the legacy DEVELOPER plan and promote them to OWNER_PLAN.
  const legacyProjects = await prisma.developerProject.findMany({
    where: { plan: "DEVELOPER" },
    select: { id: true, ownerId: true, developerId: true },
  });

  console.log(`Found ${legacyProjects.length} developer projects with DEVELOPER plan.`);

  if (legacyProjects.length > 0) {
    const projectIds = legacyProjects.map(project => project.id);

    const updateResult = await prisma.developerProject.updateMany({
      where: { id: { in: projectIds } },
      data: { plan: "OWNER_PLAN" },
    });

    console.log(`Updated ${updateResult.count} projects to OWNER_PLAN.`);
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
