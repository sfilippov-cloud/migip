"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Menu, X } from "lucide-react";

interface CategoryInfo {
  name: string | null;
}

interface DashboardContextValue {
  setSelectedCategories: (cats: CategoryInfo[]) => void;
}

const DashboardContext = createContext<DashboardContextValue>({
  setSelectedCategories: () => {},
});

export function useDashboard() {
  return useContext(DashboardContext);
}

interface DashboardShellProps {
  user: {
    name: string;
    email: string;
    groupName: string;
  };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [selectedCategories, setSelectedCategories] = useState<CategoryInfo[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSetCategories = useCallback((cats: CategoryInfo[]) => {
    setSelectedCategories(cats);
  }, []);

  return (
    <DashboardContext.Provider value={{ setSelectedCategories: handleSetCategories }}>
      <div className="flex h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — always visible on lg+, slide-in on mobile */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            user={user}
            selectedRuleCategories={selectedCategories}
            onNavigate={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <div className="flex items-center border-b px-4 py-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded p-1.5 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <main className="flex flex-1 flex-col overflow-hidden p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
