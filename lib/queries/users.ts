import { prisma } from "@/lib/db";

interface UserWithDetails {
  id: number;
  email: string | null;
  name: string | null;
  password: string | null;
  category: number | null;
  user_group_id: number | null;
  group_name: string | null;
  category_name: string | null;
}

export async function getUsers(): Promise<UserWithDetails[]> {
  return prisma.$queryRaw<UserWithDetails[]>`
    SELECT
      u.id,
      u.email,
      u.name,
      u.password,
      u.category,
      u.user_group_id,
      ug.name as group_name,
      ato.name as category_name
    FROM users u
    LEFT JOIN user_group ug ON ug.id = u.user_group_id
    LEFT JOIN applies_to ato ON ato.id = u.category
    ORDER BY u.id
  `;
}

interface UserGroup {
  id: number;
  name: string;
}

export async function getUserGroups(): Promise<UserGroup[]> {
  return prisma.$queryRaw<UserGroup[]>`
    SELECT id, name FROM user_group ORDER BY id
  `;
}
