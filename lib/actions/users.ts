"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.groupName !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  category: number;
  userGroupId: number;
}) {
  await requireAdmin();

  // Check email uniqueness
  const existing = await prisma.users.findFirst({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("Пользователь с таким email уже существует");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  await prisma.users.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      category: data.category,
      user_group_id: data.userGroupId,
    },
  });

  revalidatePath("/users");
}

export async function updateUser(
  userId: number,
  data: {
    name: string;
    email: string;
    password?: string;
    category: number;
    userGroupId: number;
  }
) {
  await requireAdmin();

  // Check email uniqueness (exclude current user)
  const existing = await prisma.users.findFirst({
    where: { email: data.email, id: { not: userId } },
  });
  if (existing) {
    throw new Error("Пользователь с таким email уже существует");
  }

  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    category: data.category,
    user_group_id: data.userGroupId,
  };

  // Only update password if provided
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  await prisma.users.update({
    where: { id: userId },
    data: updateData,
  });

  revalidatePath("/users");
}

export async function deleteUser(userId: number) {
  await requireAdmin();

  await prisma.users.delete({ where: { id: userId } });

  revalidatePath("/users");
}
