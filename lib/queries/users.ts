import { prisma } from "@/lib/db";

export async function getUsers() {
  return prisma.users.findMany({
    include: {
      user_group: true,
      category_ref: true,
    },
    orderBy: { id: "asc" },
  });
}

export async function getUserGroups() {
  return prisma.user_group.findMany();
}
