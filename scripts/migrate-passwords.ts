/**
 * One-time migration script: hash all plain-text passwords with bcrypt.
 *
 * Usage:
 *   npx dotenv -e .env -- tsx scripts/migrate-passwords.ts
 *   OR
 *   npx tsx scripts/migrate-passwords.ts  (if DATABASE_URL is exported in shell)
 *
 * This script:
 * 1. Reads all users from the database
 * 2. Checks if each password is already hashed (starts with "$2")
 * 3. Hashes plain-text passwords with bcrypt (cost factor 10)
 * 4. Updates the user record
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.users.findMany();
  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.password) {
      console.log(`[skip] User ${user.id} (${user.email}): no password`);
      skipped++;
      continue;
    }

    if (user.password.startsWith("$2")) {
      console.log(`[skip] User ${user.id} (${user.email}): already hashed`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(user.password, 10);
    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashed },
    });
    console.log(`[done] User ${user.id} (${user.email}): password hashed`);
    migrated++;
  }

  console.log(`\nMigration complete: ${migrated} hashed, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
