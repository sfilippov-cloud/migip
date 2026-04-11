"use client";

import { useState, useTransition } from "react";
import { createRule, updateRule, deleteRule, toggleArchive, improveTextWithAi } from "@/lib/actions/rules";
import { X, Sparkles, Archive, ArchiveRestore, Trash2, FileText, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { RuleDocumentLinks } from "@/components/rule-document-links";

function formatAiResponse(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

type Rule = {
  rule_uid: number;
  id: number | null;
  sub_id: number | null;
  section_id: number | null;
  rule_type_id: number | null;
  status_id: number | null;
  decision_body_id: number | null;
  decision_date: Date | null;
  text: string | null;
  persona: string | null;
  group_id: number | null;
  rule_applies_to: {
    applies_to_id: number;
    applies_to: { id: number; name: string | null };
  }[];
};

type Section = { id: number; name: string | null };
type RuleType = { id: number; name: string | null };
type DecisionBody = { id: number; code: string | null; name: string | null };
type Category = { id: number; name: string | null; description: string | null };
type LinkedDocument = {
  id: number;
  title: string;
  file_name: string;
  decision_date: Date | null;
  decision_body: { id: number; code: string | null; name: string } | null;
};
type DocumentSummary = {
  id: number;
  title: string;
  file_name: string;
  decision_date: Date | null;
  decision_body: { id: number; code: string | null; name: string } | null;
};

interface RuleDialogProps {
  mode: "add" | "edit";
  rule?: Rule;
  sections: Section[];
  ruleTypes: RuleType[];
  decisionBodies: DecisionBody[];
  categories: Category[];
  groupId: number;
  isAdmin?: boolean;
  defaultSectionId?: number;
  defaultTypeId?: number;
  defaultId?: number;
  defaultSubId?: number;
  linkedDocuments?: LinkedDocument[];
  allDocuments?: DocumentSummary[];
  onClose: (didMutate?: boolean) => void;
}

export function RuleDialog({
  mode,
  rule,
  sections,
  ruleTypes,
  decisionBodies,
  categories,
  groupId,
  isAdmin,
  defaultSectionId,
  defaultTypeId,
  defaultId,
  defaultSubId,
  linkedDocuments,
  allDocuments,
  onClose,
}: RuleDialogProps) {
  const [isSaving, startSaveTransition] = useTransition();
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: rule?.id ?? defaultId ?? 0,
    subId: rule?.sub_id ?? defaultSubId ?? 0,
    sectionId: rule?.section_id ?? defaultSectionId ?? 1,
    ruleTypeId: rule?.rule_type_id ?? defaultTypeId ?? 1,
    decisionBodyId: rule?.decision_body_id ?? null as number | null,
    decisionDate: rule?.decision_date
      ? new Date(rule.decision_date).toISOString().split("T")[0]
      : "",
    persona: rule?.persona ?? "",
    text: rule?.text ?? "",
    categoryIds: rule?.rule_applies_to.map((r) => r.applies_to_id) ?? [],
    documentIds: [] as number[],
  });

  function handleSubmit() {
    if (!formData.text.trim()) {
      toast.error("Текст правила не может быть пустым");
      return;
    }

    startSaveTransition(async () => {
      try {
        if (mode === "add") {
          await createRule({
            id: formData.id,
            subId: formData.subId,
            sectionId: formData.sectionId,
            ruleTypeId: formData.ruleTypeId,
            decisionBodyId: formData.decisionBodyId,
            decisionDate: formData.decisionDate || null,
            persona: formData.persona || null,
            groupId,
            text: formData.text,
            categoryIds: formData.categoryIds,
            documentIds: formData.documentIds,
          });
          toast.success("Правило добавлено");
        } else {
          await updateRule(rule!.rule_uid, {
            id: formData.id,
            subId: formData.subId,
            decisionBodyId: formData.decisionBodyId,
            decisionDate: formData.decisionDate || null,
            groupId,
            persona: formData.persona || null,
            text: formData.text,
            categoryIds: formData.categoryIds,
          });
          toast.success("Правило обновлено");
        }
        onClose(true);
      } catch {
        toast.error("Ошибка при сохранении");
      }
    });
  }

  function handleArchive() {
    if (!rule) return;
    startSaveTransition(async () => {
      try {
        await toggleArchive(rule.rule_uid, rule.status_id!);
        toast.success(rule.status_id === 1 ? "Правило архивировано" : "Правило восстановлено");
        onClose(true);
      } catch {
        toast.error("Ошибка при изменении статуса");
      }
    });
  }

  function handleDelete() {
    if (!rule || !confirm("Вы уверены, что хотите удалить это правило?")) return;
    startSaveTransition(async () => {
      try {
        await deleteRule(rule.rule_uid);
        toast.success("Правило удалено");
        onClose(true);
      } catch {
        toast.error("Ошибка при удалении");
      }
    });
  }

  async function handleAiCheck() {
    setIsAiChecking(true);
    try {
      const result = await improveTextWithAi(formData.text);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAiResponse(result.result?.output ?? JSON.stringify(result.result, null, 2));
      }
    } finally {
      setIsAiChecking(false);
    }
  }

  function toggleCategory(catId: number) {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter((id) => id !== catId)
        : [...prev.categoryIds, catId],
    }));
  }

  const title = mode === "add" ? "Добавить правило" : "Редактировать правило";

  const formContent = (
    <>
      <div className="space-y-4">
        {/* Section and Type (only for add mode of organizational rules) */}
        {mode === "add" && groupId === 1 && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Раздел</label>
              <select
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: Number(e.target.value) })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}. {s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Подраздел</label>
              <select
                value={formData.ruleTypeId}
                onChange={(e) => setFormData({ ...formData, ruleTypeId: Number(e.target.value) })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {ruleTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.id}. {t.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Persona (for personal decisions) */}
        {groupId === 2 && (
          <div>
            <label className="mb-1 block text-sm font-medium">Персона</label>
            <input
              type="text"
              value={formData.persona}
              onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="ФИО"
            />
          </div>
        )}

        {/* ID and Sub-ID */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Пункт</label>
            <input
              type="number"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: Number(e.target.value) })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          {groupId !== 2 && (
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Подпункт</label>
              <input
                type="number"
                value={formData.subId}
                onChange={(e) => setFormData({ ...formData, subId: Number(e.target.value) })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        {/* Decision body and date */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Орган решения</label>
            <select
              value={formData.decisionBodyId ?? ""}
              onChange={(e) => setFormData({ ...formData, decisionBodyId: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Не указано</option>
              {decisionBodies.map((b) => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Дата решения</label>
            <input
              type="date"
              value={formData.decisionDate}
              onChange={(e) => setFormData({ ...formData, decisionDate: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Text */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">Текст правила</label>
            <button
              onClick={handleAiCheck}
              disabled={isAiChecking || !formData.text.trim()}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" /> {isAiChecking ? "Проверяю..." : "Проверить ИИ"}
            </button>
          </div>
          <textarea
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            rows={6}
            className="w-full rounded-md border bg-white px-3 py-2 text-sm"
            placeholder="Введите текст правила..."
          />
        </div>

        {/* AI Response (inline) */}
        {aiResponse && (
          <div className="rounded-md border border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between border-b border-blue-200 px-3 py-2">
              <span className="text-xs font-semibold text-blue-700">Ответ ИИ</span>
              <button onClick={() => setAiResponse(null)} className="rounded p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-48 overflow-auto p-3">
              <div className="text-sm leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: formatAiResponse(aiResponse) }} />
            </div>
          </div>
        )}

        {/* Categories */}
        <div>
          <label className="mb-2 block text-sm font-medium">Категории</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  formData.categoryIds.includes(cat.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.categoryIds.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  className="sr-only"
                />
                {cat.name}
              </label>
            ))}
          </div>
        </div>

        {/* Linked Documents */}
        {mode === "edit" && isAdmin && rule && allDocuments && (
          <RuleDocumentLinks
            ruleUid={rule.rule_uid}
            linkedDocuments={linkedDocuments ?? []}
            allDocuments={allDocuments}
          />
        )}
        {mode === "add" && isAdmin && allDocuments && allDocuments.length > 0 && (
          <AddModeDocumentPicker
            allDocuments={allDocuments}
            selectedIds={formData.documentIds}
            onChange={(ids) => setFormData((prev) => ({ ...prev, documentIds: ids }))}
          />
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div className="flex gap-2">
          {mode === "edit" && isAdmin && (
            <>
              <button
                onClick={handleArchive}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                title={rule?.status_id === 1 ? "Архивировать" : "Восстановить"}
              >
                {rule?.status_id === 1 ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                <span className="hidden sm:inline">{rule?.status_id === 1 ? "Архив" : "Восстановить"}</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Удалить</span>
              </button>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => onClose()} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? "Сохраняю..." : mode === "add" ? "Добавить" : "Сохранить"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: fullscreen overlay */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{title}</span>
          <button onClick={() => onClose()} className="rounded p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {formContent}
        </div>
      </div>

      {/* Desktop: side panel */}
      <div className="hidden shrink-0 flex-col overflow-hidden rounded-lg border lg:flex lg:w-[600px]">
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          <span className="text-sm font-semibold">{title}</span>
          <button onClick={() => onClose()} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {formContent}
        </div>
      </div>
    </>
  );
}

// ---- Document picker for add mode (local state, no server calls) ----

function AddModeDocumentPicker({
  allDocuments,
  selectedIds,
  onChange,
}: {
  allDocuments: DocumentSummary[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedDocs = allDocuments.filter((d) => selectedIds.includes(d.id));
  const available = allDocuments.filter((d) => !selectedIds.includes(d.id));
  const filtered = searchQuery
    ? available.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : available;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mb-2 flex items-center gap-1.5 text-sm font-medium"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Документы
        {selectedIds.length > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">{selectedIds.length}</span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2">
          {selectedDocs.length === 0 && !showPicker && (
            <p className="text-xs text-gray-400">Нет прикреплённых документов</p>
          )}

          {selectedDocs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
              <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate font-medium">{doc.title}</span>
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((id) => id !== doc.id))}
                className="rounded p-1 text-gray-400 hover:text-red-600"
                title="Убрать"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {showPicker ? (
            <div className="space-y-2 rounded-md border border-dashed p-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Найти документ..."
                className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                autoFocus
              />
              <div className="max-h-32 overflow-auto">
                {filtered.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-gray-400">
                    {available.length === 0 ? "Все документы уже добавлены" : "Ничего не найдено"}
                  </p>
                ) : (
                  filtered.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        onChange([...selectedIds, doc.id]);
                        setShowPicker(false);
                        setSearchQuery("");
                      }}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => { setShowPicker(false); setSearchQuery(""); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-1 rounded border border-dashed px-2.5 py-1.5 text-xs text-gray-500 hover:border-primary hover:text-primary"
            >
              <Plus className="h-3 w-3" /> Прикрепить документ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
