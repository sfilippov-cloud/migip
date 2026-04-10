"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { deleteRule, toggleArchive } from "@/lib/actions/rules";
import { RuleDialog } from "@/components/rule-dialog";
import { AiDrawer } from "@/components/ai-drawer";
import { toast } from "sonner";

type Rule = {
  rule_uid: number;
  id: number | null;
  sub_id: number | null;
  section_id: number | null;
  rule_type_id: number | null;
  status_id: number | null;
  decision_body_id: number | null;
  decision_date: Date | null;
  decision_note: string | null;
  summary: string | null;
  text: string | null;
  persona: string | null;
  group_id: number | null;
  decision_body: { id: number; code: string | null; name: string | null } | null;
  status: { id: number; name: string | null } | null;
  section: { id: number; name: string | null } | null;
  rule_type: { id: number; name: string | null } | null;
  rule_applies_to: {
    rule_uid: number;
    applies_to_id: number;
    applies_to: { id: number; name: string | null; description: string | null };
  }[];
};

type DecisionBody = { id: number; code: string | null; name: string | null };
type Category = { id: number; name: string | null; description: string | null };

interface PersonalClientProps {
  rules: Rule[];
  decisionBodies: DecisionBody[];
  categories: Category[];
  personas: string[];
  currentPersona?: string;
  showArchived: boolean;
  isAdmin: boolean;
}

export function PersonalClient({
  rules,
  decisionBodies,
  categories,
  personas,
  currentPersona,
  showArchived,
  isAdmin,
}: PersonalClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/personal?${params.toString()}`);
  }

  function handleArchiveToggle(ruleUid: number, statusId: number) {
    startTransition(async () => {
      try {
        await toggleArchive(ruleUid, statusId);
        toast.success(statusId === 1 ? "Решение архивировано" : "Решение восстановлено");
      } catch {
        toast.error("Ошибка при изменении статуса");
      }
    });
  }

  function handleDelete(ruleUid: number) {
    if (!confirm("Вы уверены, что хотите удалить это решение?")) return;
    startTransition(async () => {
      try {
        await deleteRule(ruleUid);
        toast.success("Решение удалено");
      } catch {
        toast.error("Ошибка при удалении");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Персональные решения</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Добавить
            </button>
          )}
          <a
            href={`/api/pdf/personal${currentPersona ? `?persona=${encodeURIComponent(currentPersona)}` : ""}`}
            download
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Скачать PDF
          </a>
          <button
            onClick={() => setShowAiDrawer(true)}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Спросить ИИ
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Персона:</label>
          <select
            value={currentPersona ?? ""}
            onChange={(e) =>
              updateFilter("persona", e.target.value || undefined)
            }
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="">Все</option>
            {personas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) =>
                updateFilter(
                  "archived",
                  e.target.checked ? "true" : undefined
                )
              }
              className="rounded"
            />
            Показать архивные
          </label>
        )}
      </div>

      {/* Personal Decisions Table */}
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">N</th>
              <th className="px-4 py-3">Персона</th>
              <th className="px-4 py-3">Текст решения</th>
              <th className="px-4 py-3">Орган</th>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Статус</th>
              {isAdmin && <th className="px-4 py-3">Действия</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Нет решений для отображения
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr
                  key={rule.rule_uid}
                  className={`hover:bg-gray-50 ${rule.status_id === 2 ? "opacity-50" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {rule.id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {rule.persona}
                  </td>
                  <td className="max-w-lg px-4 py-3">
                    <p className="line-clamp-3">{rule.text}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {rule.decision_body?.code}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatDate(rule.decision_date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        rule.status_id === 1
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {rule.status?.name ?? (rule.status_id === 1 ? "Активный" : "Архив")}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="rounded px-2 py-1 text-xs hover:bg-gray-100"
                        >
                          Изм.
                        </button>
                        <button
                          onClick={() =>
                            handleArchiveToggle(rule.rule_uid, rule.status_id!)
                          }
                          className="rounded px-2 py-1 text-xs hover:bg-gray-100"
                          disabled={isPending}
                        >
                          {rule.status_id === 1 ? "Арх." : "Восст."}
                        </button>
                        <button
                          onClick={() => handleDelete(rule.rule_uid)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          disabled={isPending}
                        >
                          Уд.
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingRule && (
        <RuleDialog
          mode="edit"
          rule={editingRule}
          sections={[]}
          ruleTypes={[]}
          decisionBodies={decisionBodies}
          categories={categories}
          groupId={2}
          onClose={() => setEditingRule(null)}
        />
      )}

      {showAddDialog && (
        <RuleDialog
          mode="add"
          sections={[]}
          ruleTypes={[]}
          decisionBodies={decisionBodies}
          categories={categories}
          groupId={2}
          onClose={() => setShowAddDialog(false)}
        />
      )}

      {showAiDrawer && (
        <AiDrawer onClose={() => setShowAiDrawer(false)} />
      )}
    </div>
  );
}
