import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.jobPosition.updateMany({
    where: { title: "System Administrator" },
    data: { title: "Director" }
  });
  console.log("Renamed System Administrator to Director");
}

main().catch(console.error).finally(() => prisma.$disconnect());
