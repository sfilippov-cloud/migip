import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsers, getUserGroups } from "@/lib/queries/users";
import { getAppliesTo } from "@/lib/queries/lookups";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Only admins can access
  if (session.user.groupName !== "admin") {
    redirect("/rules");
  }

  const [users, userGroups, categories] = await Promise.all([
    getUsers(),
    getUserGroups(),
    getAppliesTo(),
  ]);

  return (
    <UsersClient
      users={users}
      userGroups={userGroups}
      categories={categories}
    />
  );
}
