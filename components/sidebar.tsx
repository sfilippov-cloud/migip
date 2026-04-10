"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    groupName: string;
  };
}

const navItems = [
  { href: "/rules", label: "Правила", icon: "📋" },
  { href: "/personal", label: "Персональные решения", icon: "👤" },
];

const adminItems = [
  { href: "/users", label: "Пользователи", icon: "⚙️" },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.groupName === "admin";

  return (
    <aside className="flex w-64 flex-col border-r bg-gray-50">
      <div className="flex items-center gap-3 border-b px-4 py-5">
        <Image src="/migip_logo.png" alt="MIGIP" width={36} height={36} />
        <span className="text-lg font-semibold">MIGIP</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="my-3 border-t" />
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="border-t px-4 py-4">
        <div className="mb-2 text-sm">
          <p className="font-medium text-gray-900">{user.name}</p>
          <p className="text-gray-500">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-md border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
