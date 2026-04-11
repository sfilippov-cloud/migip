"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { BookOpen, User, Settings, FileText, HelpCircle, LogOut } from "lucide-react";

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
  { href: "/rules", label: "Правила", icon: BookOpen },
  { href: "/personal", label: "Персональные решения", icon: User },
];

const adminItems = [
  { href: "/documents", label: "Документы", icon: FileText },
  { href: "/users", label: "Пользователи", icon: Settings },
  { href: "/admin-guide", label: "Руководство", icon: HelpCircle },
];

export function Sidebar({ user, selectedRuleCategories, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.groupName === "admin";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center justify-center border-b px-4 py-4">
        <Image src="/migip_logo.png" alt="MIGIP" width={160} height={60} className="h-auto w-auto max-h-[60px]" />
      </div>

      <nav className="space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-sidebar-active text-sidebar-active-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t" />
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-sidebar-active text-sidebar-active-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Доступно для: */}
      {isAdmin && (pathname === "/rules" || pathname === "/personal") && selectedRuleCategories && selectedRuleCategories.length > 0 && (
        <div className="border-t px-4 py-4">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Доступно для:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedRuleCategories.map((cat, i) => (
              <span
                key={i}
                className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {cat.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto border-t px-4 py-4">
        <div className="mb-2 text-sm">
          <p className="font-medium text-foreground">{user.name}</p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
