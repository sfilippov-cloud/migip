"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { RuleDialog } from "@/components/rule-dialog";
import { AiPanel } from "@/components/ai-panel";
import { Pencil, Sparkles, X, Plus, Download } from "lucide-react";
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold md:text-2xl">Персональные решения</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              title="Добавить"
            >
              <Plus className="h-4 w-4" /> <span className="hidden md:inline">Добавить</span>
            </button>
          )}
          <a
            href={`/api/pdf/personal${persona ? `?persona=${encodeURIComponent(persona)}` : ""}`}
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            title="Скачать PDF"
          >
            <Download className="h-4 w-4" /> <span className="hidden md:inline">PDF</span>
          </a>
          <button
            onClick={() => setShowAiPanel((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${showAiPanel ? "border-primary bg-primary/5 text-primary" : "hover:bg-gray-50"}`}
            title="Спросить ИИ"
          >
            <Sparkles className="h-4 w-4" /> <span className="hidden md:inline">Спросить ИИ</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 md:flex-nowrap md:items-center md:gap-4">
        <div className="flex-1 md:flex md:flex-none md:items-center md:gap-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground md:mb-0 md:text-sm">Персона:</label>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="w-full rounded-md border bg-white px-3 py-1.5 text-sm md:w-auto"
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
      {/* Decisions list */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-white shadow-sm">
        {filteredRules.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">Нет решений для отображения</div>
        ) : (
          <div className="divide-y">
            {filteredRules.map((rule) => (
              <div
                key={rule.rule_uid}
                onClick={() => selectRule(rule)}
                className={`cursor-pointer px-4 py-3 transition-colors ${rule.status_id === 2 ? "opacity-50" : ""} ${selectedRule?.rule_uid === rule.rule_uid ? "border-l-4 border-l-primary bg-primary/5" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">#{rule.id}</span>
                    <span className="text-sm font-medium">{rule.persona}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(rule.decision_body?.code || rule.decision_date) && (
                      <span className="hidden text-xs text-gray-400 sm:inline">
                        {[rule.decision_body?.code, formatDate(rule.decision_date)].filter(Boolean).join(" от ")}
                      </span>
                    )}
                    {rule.status_id === 2 && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Архив</span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingRule(rule); }}
                        className="rounded p-1 text-gray-400 hover:text-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap">{rule.text}</p>
                {(rule.decision_body?.code || rule.decision_date) && (
                  <p className="mt-1 text-xs text-gray-400 sm:hidden">
                    {[rule.decision_body?.code, formatDate(rule.decision_date)].filter(Boolean).join(" от ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
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

      {/* AI Panel — fullscreen on mobile, side panel on desktop */}
      {showAiPanel && (
        <>
          <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">ИИ Ассистент</span>
              <button onClick={() => setShowAiPanel(false)} className="rounded p-1.5 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1">
              <AiPanel userId={userId} userType={isAdmin ? "public" : String(userCategory ?? "public")} />
            </div>
          </div>
          <div className="hidden shrink-0 overflow-hidden rounded-lg border lg:block lg:w-[400px]">
            <AiPanel userId={userId} userType={isAdmin ? "public" : String(userCategory ?? "public")} />
          </div>
        </>
      )}
      </div>
    </div>
  );
}
