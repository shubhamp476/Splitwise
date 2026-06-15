import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const defaultUsers = [
    { name: "Aisha", email: "aisha@example.com", password: passwordHash },
    { name: "Rohan", email: "rohan@example.com", password: passwordHash },
    { name: "Priya", email: "priya@example.com", password: passwordHash },
    { name: "Meera", email: "meera@example.com", password: passwordHash },
    { name: "Sam", email: "sam@example.com", password: passwordHash },
  ];

  console.log("Seeding users...");

  for (const user of defaultUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existing) {
      const created = await prisma.user.create({
        data: user,
      });
      console.log(`Created user: ${created.name} (${created.email})`);
    } else {
      console.log(`User already exists: ${existing.name}`);
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
