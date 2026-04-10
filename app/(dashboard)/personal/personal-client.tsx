"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { RuleDialog } from "@/components/rule-dialog";
import { AiPanel } from "@/components/ai-panel";
import { Pencil, Sparkles } from "lucide-react";
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
  allRules: Rule[];
  decisionBodies: DecisionBody[];
  categories: Category[];
  personas: string[];
  isAdmin: boolean;
  userId: string;
  userCategory?: number | null;
  onSelectRule?: (rule: Rule | null) => void;
}

export function PersonalClient({
  allRules,
  decisionBodies,
  categories,
  personas,
  isAdmin,
  userId,
  userCategory,
  onSelectRule,
}: PersonalClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Client-side filters
  const [persona, setPersona] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);

  // Filter rules locally
  const filteredRules = useMemo(() => {
    return allRules.filter((rule) => {
      if (persona && rule.persona !== persona) return false;
      if (!showArchived && rule.status_id === 2) return false;
      return true;
    });
  }, [allRules, persona, showArchived]);

  function selectRule(rule: Rule) {
    const next = selectedRule?.rule_uid === rule.rule_uid ? null : rule;
    setSelectedRule(next);
    onSelectRule?.(next);
  }

  function handleDialogClose(didMutate?: boolean) {
    setEditingRule(null);
    setShowAddDialog(false);
    if (didMutate) {
      setSelectedRule(null);
      onSelectRule?.(null);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold lg:text-2xl">Персональные решения</h1>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:px-4 lg:py-2"
            >
              Добавить
            </button>
          )}
          <a
            href={`/api/pdf/personal${persona ? `?persona=${encodeURIComponent(persona)}` : ""}`}
            download
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 lg:px-4 lg:py-2"
          >
            PDF
          </a>
          <button
            onClick={() => setShowAiPanel((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium lg:px-4 lg:py-2 ${showAiPanel ? "border-primary bg-primary/5 text-primary" : "hover:bg-gray-50"}`}
          >
            <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Спросить</span> ИИ
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Персона:</label>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
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
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Показать архивные
          </label>
        )}
      </div>

      {/* Table + AI Panel */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-3 py-3 lg:px-4">N</th>
              <th className="px-3 py-3 lg:px-4">Персона</th>
              <th className="px-3 py-3 lg:px-4">Текст решения</th>
              <th className="hidden px-4 py-3 md:table-cell">Орган</th>
              <th className="hidden px-4 py-3 md:table-cell">Дата</th>
              <th className="hidden px-4 py-3 sm:table-cell">Статус</th>
              {isAdmin && <th className="w-10 px-2 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRules.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Нет решений для отображения
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => (
                <tr
                  key={rule.rule_uid}
                  onClick={() => selectRule(rule)}
                  className={`cursor-pointer ${rule.status_id === 2 ? "opacity-50" : ""} ${selectedRule?.rule_uid === rule.rule_uid ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <td className="whitespace-nowrap px-3 py-3 font-medium lg:px-4">
                    {rule.id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 lg:px-4">
                    {rule.persona}
                  </td>
                  <td className="px-3 py-3 whitespace-pre-wrap lg:px-4">
                    {rule.text}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                    {rule.decision_body?.code}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                    {formatDate(rule.decision_date)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
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
                    <td className="whitespace-nowrap px-2 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingRule(rule); }}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="Редактировать"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
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
          isAdmin={isAdmin}
          onClose={handleDialogClose}
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
          isAdmin={isAdmin}
          onClose={handleDialogClose}
        />
      )}

      {/* AI Panel */}
      {showAiPanel && (
        <div className="h-[300px] shrink-0 rounded-lg border lg:h-auto lg:w-[400px]">
          <AiPanel userId={userId} userType={isAdmin ? "public" : String(userCategory ?? "public")} />
        </div>
      )}
      </div>
    </div>
  );
}
