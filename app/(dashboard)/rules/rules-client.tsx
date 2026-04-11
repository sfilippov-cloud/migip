"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { deleteRule, toggleArchive } from "@/lib/actions/rules";
import { RuleDialog } from "@/components/rule-dialog";
import { AiPanel } from "@/components/ai-panel";
import { DocPreviewPanel } from "@/components/doc-preview-panel";
import { Pencil, Sparkles, ChevronLeft, ChevronRight, X, Plus, Download, FileText } from "lucide-react";
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
  rule_documents?: {
    document: {
      id: number;
      title: string;
      file_name: string;
      mime_type: string;
      decision_date: Date | null;
      decision_body: { id: number; code: string | null; name: string } | null;
    };
  }[];
};

type Section = { id: number; name: string | null };
type RuleType = { id: number; name: string | null };
type DecisionBody = { id: number; code: string | null; name: string | null };
type Category = { id: number; name: string | null; description: string | null };

type DocumentSummary = {
  id: number;
  title: string;
  file_name: string;
  decision_date: Date | null;
  decision_body: { id: number; code: string | null; name: string } | null;
};

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
  allDocuments?: DocumentSummary[];
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
  allDocuments,
  onSelectRule,
}: RulesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    id: number; title: string; fileName: string; mimeType: string;
  } | null>(null);

  function closeAllPanels() {
    setEditingRule(null);
    setShowAddDialog(false);
    setShowAiPanel(false);
    setPreviewDoc(null);
  }

  function openEditRule(rule: Rule) {
    closeAllPanels();
    setEditingRule(rule);
  }

  function openAddDialog() {
    closeAllPanels();
    setShowAddDialog(true);
  }

  function openAiPanel() {
    closeAllPanels();
    setShowAiPanel(true);
  }

  function openDocPreview(doc: { id: number; title: string; fileName: string; mimeType: string }) {
    closeAllPanels();
    setPreviewDoc(doc);
  }

  function selectRule(rule: Rule) {
    const next = selectedRule?.rule_uid === rule.rule_uid ? null : rule;
    setSelectedRule(next);
    onSelectRule?.(next);
  }

  // Client-side filters
  const [sectionId, setSectionId] = useState<number | "">("");
  const [typeId, setTypeId] = useState<number | "">("");
  const [showArchived, setShowArchived] = useState(false);

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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold md:text-2xl">Правила МИГИПа</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => openAddDialog()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              title="Добавить"
            >
              <Plus className="h-4 w-4" /> <span className="hidden md:inline">Добавить</span>
            </button>
          )}
          <a
            href="/api/pdf/rules"
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            title="Скачать PDF"
          >
            <Download className="h-4 w-4" /> <span className="hidden md:inline">PDF</span>
          </a>
          <button
            onClick={() => showAiPanel ? setShowAiPanel(false) : openAiPanel()}
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
          <label className="mb-1 block text-xs font-medium text-muted-foreground md:mb-0 md:text-sm">Раздел:</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-md border bg-white px-3 py-1.5 text-sm md:w-auto"
          >
            <option value="">Все</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 md:flex md:flex-none md:items-center md:gap-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground md:mb-0 md:text-sm">Подраздел:</label>
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-md border bg-white px-3 py-1.5 text-sm md:w-auto"
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
      {/* Rules list */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-white shadow-sm">
        {filteredRules.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">Нет правил для отображения</div>
        ) : (
          <div className="divide-y">
            {filteredRules.map((rule, idx) => {
              const prev = idx > 0 ? filteredRules[idx - 1] : null;
              const showSection = rule.section_id !== prev?.section_id;
              const showType = showSection || rule.rule_type_id !== prev?.rule_type_id;
              return (
                <Fragment key={rule.rule_uid}>
                  {showSection && (
                    <div className="border-l-4 border-l-primary bg-primary/5 px-4 py-2 text-sm font-semibold text-foreground">
                      {rule.section_id}. {rule.section?.name}
                    </div>
                  )}
                  {showType && (
                    <div className="bg-muted/50 px-4 py-1.5 pl-8 text-sm font-medium text-muted-foreground">
                      {rule.rule_type_id}. {rule.rule_type?.name}
                    </div>
                  )}
                  <div
                    onClick={() => selectRule(rule)}
                    className={`cursor-pointer px-4 py-3 transition-colors ${rule.status_id === 2 ? "opacity-50" : ""} ${selectedRule?.rule_uid === rule.rule_uid ? "border-l-4 border-l-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-500">
                        {rule.section_id}.{rule.rule_type_id}.{rule.id}{rule.sub_id ? `.${rule.sub_id}` : ""}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {(rule.decision_body?.code || rule.decision_date) && (
                          <span className="hidden text-xs text-gray-400 sm:inline">
                            {[rule.decision_body?.code, formatDate(rule.decision_date)].filter(Boolean).join(" от ")}
                          </span>
                        )}
                        {rule.status_id === 2 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Архив</span>
                        )}
                        {isAdmin && rule.rule_documents && rule.rule_documents.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const doc = rule.rule_documents![0].document;
                              openDocPreview({ id: doc.id, title: doc.title, fileName: doc.file_name, mimeType: doc.mime_type });
                            }}
                            className="rounded p-1 text-blue-400 hover:text-blue-600"
                            title={`Документы (${rule.rule_documents.length})`}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditRule(rule); }}
                            className="rounded p-1 text-gray-400 hover:text-gray-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={`mt-1 text-sm whitespace-pre-wrap ${rule.sub_id ? "pl-4" : ""}`}>{rule.text}</p>
                    {(rule.decision_body?.code || rule.decision_date) && (
                      <p className="mt-1 text-xs text-gray-400 sm:hidden">
                        {[rule.decision_body?.code, formatDate(rule.decision_date)].filter(Boolean).join(" от ")}
                      </p>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
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
          linkedDocuments={editingRule.rule_documents?.map((rd) => rd.document)}
          allDocuments={allDocuments}
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
          defaultSectionId={selectedRule?.section_id ?? (sectionId || undefined)}
          defaultTypeId={selectedRule?.rule_type_id ?? (typeId || undefined)}
          defaultId={selectedRule ? (selectedRule.sub_id && selectedRule.sub_id > 0 ? selectedRule.id ?? 0 : (selectedRule.id ?? 0) + 1) : undefined}
          defaultSubId={selectedRule ? (selectedRule.sub_id && selectedRule.sub_id > 0 ? selectedRule.sub_id + 1 : 0) : undefined}
          allDocuments={allDocuments}
          onClose={handleDialogClose}
        />
      )}

      {/* AI Panel — fullscreen on mobile, side panel on desktop */}
      {showAiPanel && (
        <>
          <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white lg:hidden">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">ИИ Ассистент</span>
              <button onClick={() => setShowAiPanel(false)} className="rounded p-1.5 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <AiPanel userId={userId} userType={isAdmin ? "public" : String(userCategory ?? "public")} />
            </div>
          </div>
          <div className="hidden shrink-0 flex-col overflow-hidden rounded-lg border lg:flex lg:w-[400px]">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">ИИ Ассистент</span>
              <button onClick={() => setShowAiPanel(false)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <AiPanel userId={userId} userType={isAdmin ? "public" : String(userCategory ?? "public")} />
            </div>
          </div>
        </>
      )}

      {/* Document Preview Panel */}
      {previewDoc && (
        <DocPreviewPanel
          documentId={previewDoc.id}
          title={previewDoc.title}
          fileName={previewDoc.fileName}
          mimeType={previewDoc.mimeType}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      </div>
    </div>
  );
}
