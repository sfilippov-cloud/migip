"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface CategoryInfo {
  name: string | null;
}

interface SidebarProps {
  user: {
    name: string;
    email: string;
    groupName: string;
  };
  selectedRuleCategories?: CategoryInfo[];
  onNavigate?: () => void;
}

const navItems = [
  { href: "/rules", label: "Правила", icon: "📋" },
  { href: "/personal", label: "Персональные решения", icon: "👤" },
];

const adminItems = [
  { href: "/users", label: "Пользователи", icon: "⚙️" },
];

export function Sidebar({ user, selectedRuleCategories, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.groupName === "admin";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-gray-50">
      <div className="flex items-center justify-center border-b px-4 py-4">
        <Image src="/migip_logo.png" alt="MIGIP" width={160} height={60} className="h-auto w-auto max-h-[60px]" />
      </div>

      <nav className="space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
                onClick={onNavigate}
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

      {/* Доступно для: */}
      {selectedRuleCategories && selectedRuleCategories.length > 0 && (
        <div className="border-t px-4 py-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
            Доступно для:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedRuleCategories.map((cat, i) => (
              <span
                key={i}
                className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {cat.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto border-t px-4 py-4">
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
