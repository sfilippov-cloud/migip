"use client";

import { useState, useTransition } from "react";
import { createUser, updateUser, deleteUser } from "@/lib/actions/users";
import { toast } from "sonner";

type User = {
  id: number;
  name: string | null;
  email: string | null;
  password: string | null;
  category: number | null;
  user_group_id: number | null;
  group_name: string | null;
  category_name: string | null;
};

type UserGroup = { id: number; name: string | null };
type Category = { id: number; name: string | null; description: string | null };

interface UsersClientProps {
  users: User[];
  userGroups: UserGroup[];
  categories: Category[];
}

export function UsersClient({ users, userGroups, categories }: UsersClientProps) {
  const [isPending, startTransition] = useTransition();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  function handleDelete(userId: number) {
    if (!confirm("Вы уверены, что хотите удалить пользователя?")) return;
    startTransition(async () => {
      try {
        await deleteUser(userId);
        toast.success("Пользователь удален");
      } catch {
        toast.error("Ошибка при удалении");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <button
          onClick={() => setShowAddDialog(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Добавить
        </button>
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Имя</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Категория</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{user.id}</td>
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.category_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.group_name === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {user.group_name ?? "viewer"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="rounded px-2 py-1 text-xs hover:bg-gray-100"
                    >
                      Изм.
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      disabled={isPending}
                    >
                      Уд.
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAddDialog || editingUser) && (
        <UserDialog
          mode={editingUser ? "edit" : "add"}
          user={editingUser ?? undefined}
          userGroups={userGroups}
          categories={categories}
          onClose={() => {
            setShowAddDialog(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

// ---- User Dialog ----

function UserDialog({
  mode,
  user,
  userGroups,
  categories,
  onClose,
}: {
  mode: "add" | "edit";
  user?: User;
  userGroups: UserGroup[];
  categories: Category[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    category: user?.category ?? (categories[0]?.id ?? 1),
    userGroupId: user?.user_group_id ?? 2,
  });

  function handleSubmit() {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Заполните все обязательные поля");
      return;
    }
    if (mode === "add" && !formData.password) {
      toast.error("Введите пароль");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "add") {
          await createUser({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            category: formData.category,
            userGroupId: formData.userGroupId,
          });
          toast.success("Пользователь создан");
        } else {
          await updateUser(user!.id, {
            name: formData.name,
            email: formData.email,
            password: formData.password || undefined,
            category: formData.category,
            userGroupId: formData.userGroupId,
          });
          toast.success("Пользователь обновлен");
        }
        onClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Ошибка при сохранении"
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {mode === "add" ? "Добавить пользователя" : "Редактировать пользователя"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Имя</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Пароль{mode === "edit" && " (оставьте пустым, чтобы не менять)"}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Категория</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: Number(e.target.value) })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Роль</label>
            <select
              value={formData.userGroupId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  userGroupId: Number(e.target.value),
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {userGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending
              ? "Сохраняю..."
              : mode === "add"
                ? "Создать"
                : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
