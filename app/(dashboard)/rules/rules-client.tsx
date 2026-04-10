"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { deleteRule, toggleArchive } from "@/lib/actions/rules";
import { RuleDialog } from "@/components/rule-dialog";
import { AiPanel } from "@/components/ai-panel";
import { Pencil, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
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

type Section = { id: number; name: string | null };
type RuleType = { id: number; name: string | null };
type DecisionBody = { id: number; code: string | null; name: string | null };
type Category = { id: number; name: string | null; description: string | null };

interface RulesClientProps {
  allRules: Rule[];
  sections: Section[];
  ruleTypes: RuleType[];
  decisionBodies: DecisionBody[];
  categories: Category[];
  isAdmin: boolean;
  groupId: number;
  userId: string;
  userCategory?: number | null;
  onSelectRule?: (rule: Rule | null) => void;
}

export function RulesClient({
  allRules,
  sections,
  ruleTypes,
  decisionBodies,
  categories,
  isAdmin,
  groupId,
  userId,
  userCategory,
  onSelectRule,
}: RulesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  function selectRule(rule: Rule) {
    const next = selectedRule?.rule_uid === rule.rule_uid ? null : rule;
    setSelectedRule(next);
    onSelectRule?.(next);
  }

  // Client-side filters
  const [sectionId, setSectionId] = useState<number | "">("");
  const [typeId, setTypeId] = useState<number | "">("");
  const [showArchived, setShowArchived] = useState(false);

  const colSpan = isAdmin ? 6 : 5; // Пункт, Текст, Орган, Дата, Статус + Edit

  // Filter rules locally
  const filteredRules = useMemo(() => {
    return allRules.filter((rule) => {
      if (sectionId && rule.section_id !== sectionId) return false;
      if (typeId && rule.rule_type_id !== typeId) return false;
      if (!showArchived && rule.status_id === 2) return false;
      return true;
    });
  }, [allRules, sectionId, typeId, showArchived]);

  // Build ordered list of section/type pairs for navigation
  const navSteps = useMemo(() => {
    if (!sectionId && !typeId) return []; // both "Все" — no navigation
    if (sectionId && !typeId) {
      // Only section selected — navigate between sections
      return sections.map((s) => ({ sectionId: s.id, typeId: "" as const }));
    }
    // Both selected — navigate section+type combos in order
    const pairs: { sectionId: number; typeId: number }[] = [];
    for (const s of sections) {
      for (const t of ruleTypes) {
        pairs.push({ sectionId: s.id, typeId: t.id });
      }
    }
    return pairs;
  }, [sections, ruleTypes, sectionId, typeId]);

  const currentStepIndex = useMemo(() => {
    if (navSteps.length === 0) return -1;
    return navSteps.findIndex(
      (step) =>
        step.sectionId === sectionId &&
        (step.typeId === "" ? !typeId : step.typeId === typeId)
    );
  }, [navSteps, sectionId, typeId]);

  const canNavigate = navSteps.length > 0 && currentStepIndex !== -1;
  const canPrev = canNavigate && currentStepIndex > 0;
  const canNext = canNavigate && currentStepIndex < navSteps.length - 1;

  function goToStep(index: number) {
    const step = navSteps[index];
    setSectionId(step.sectionId);
    setTypeId(step.typeId || "");
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
        <h1 className="text-xl font-bold lg:text-2xl">Правила МИГИПа</h1>
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
            href="/api/pdf/rules"
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
          <label className="text-sm font-medium text-gray-700">Раздел:</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : "")}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="">Все</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Тип:</label>
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : "")}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="">Все</option>
            {ruleTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}. {t.name}
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-3 py-3 lg:px-4">Пункт</th>
              <th className="px-3 py-3 lg:px-4">Текст правила</th>
              <th className="hidden px-4 py-3 md:table-cell">Орган</th>
              <th className="hidden px-4 py-3 md:table-cell">Дата</th>
              <th className="hidden px-4 py-3 sm:table-cell">Статус</th>
              {isAdmin && <th className="w-10 px-2 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                  Нет правил для отображения
                </td>
              </tr>
            ) : (
              filteredRules.map((rule, idx) => {
                const prev = idx > 0 ? filteredRules[idx - 1] : null;
                const showSection = rule.section_id !== prev?.section_id;
                const showType = showSection || rule.rule_type_id !== prev?.rule_type_id;

                return (
                  <Fragment key={rule.rule_uid}>
                    {showSection && (
                      <tr>
                        <td colSpan={colSpan} className="bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800">
                          {rule.section_id}. {rule.section?.name}
                        </td>
                      </tr>
                    )}
                    {showType && (
                      <tr>
                        <td colSpan={colSpan} className="bg-gray-50 px-4 py-1.5 pl-8 text-sm font-medium text-gray-600">
                          {rule.rule_type_id}. {rule.rule_type?.name}
                        </td>
                      </tr>
                    )}
                    <tr
                      onClick={() => selectRule(rule)}
                      className={`cursor-pointer ${rule.status_id === 2 ? "opacity-50" : ""} ${selectedRule?.rule_uid === rule.rule_uid ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-medium lg:px-4">
                        {rule.section_id}.{rule.rule_type_id}.{rule.id}{rule.sub_id ? `.${rule.sub_id}` : ""}
                      </td>
                      <td className={`px-3 py-3 whitespace-pre-wrap lg:px-4 ${rule.sub_id ? "pl-6 lg:pl-8" : ""}`}>
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
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goToStep(currentStepIndex - 1)}
          disabled={!canPrev}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" /> Предыдущий раздел
        </button>
        <button
          onClick={() => goToStep(currentStepIndex + 1)}
          disabled={!canNext}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-30"
        >
          Следующий раздел <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      </div>

      {/* Edit Rule Dialog */}
      {editingRule && (
        <RuleDialog
          mode="edit"
          rule={editingRule}
          sections={sections}
          ruleTypes={ruleTypes}
          decisionBodies={decisionBodies}
          categories={categories}
          groupId={groupId}
          isAdmin={isAdmin}
          onClose={handleDialogClose}
        />
      )}

      {/* Add Rule Dialog */}
      {showAddDialog && (
        <RuleDialog
          mode="add"
          sections={sections}
          ruleTypes={ruleTypes}
          decisionBodies={decisionBodies}
          categories={categories}
          groupId={groupId}
          isAdmin={isAdmin}
          defaultSectionId={sectionId || undefined}
          defaultTypeId={typeId || undefined}
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
