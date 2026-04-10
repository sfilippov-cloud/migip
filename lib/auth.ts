import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    category: number | null;
    userGroupId: number;
    groupName: string;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    category: number | null;
    userGroupId: number;
    groupName: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Use raw SQL since user_group has no PK (@@ignore in Prisma)
        const results = await prisma.$queryRaw<
          {
            id: number;
            email: string;
            name: string | null;
            password: string;
            category: number | null;
            user_group_id: number | null;
            group_name: string | null;
          }[]
        >`
          SELECT u.id, u.email, u.name, u.password, u.category,
                 u.user_group_id, ug.name as group_name
          FROM users u
          LEFT JOIN user_group ug ON ug.id = u.user_group_id
          WHERE u.email = ${credentials.email as string}
          LIMIT 1
        `;

        const user = results[0];
        if (!user || !user.password) {
          return null;
        }

        // Support both bcrypt-hashed and legacy plain-text passwords
        let passwordValid = false;
        if (user.password.startsWith("$2")) {
          passwordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
        } else {
          // Legacy plain-text comparison (for migration period)
          passwordValid = user.password === (credentials.password as string);
        }

        if (!passwordValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email ?? "",
          name: user.name ?? "",
          category: user.category,
          userGroupId: user.user_group_id ?? 2,
          groupName: user.group_name ?? "viewer",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.name = user.name ?? "";
        token.category = user.category;
        token.userGroupId = user.userGroupId;
        token.groupName = user.groupName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        category: token.category as number | null,
        userGroupId: token.userGroupId as number,
        groupName: token.groupName as string,
      };
      return session;
    },
  },
});
