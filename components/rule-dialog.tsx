"use client";

import { useState, useTransition } from "react";
import { createRule, updateRule, deleteRule, toggleArchive, improveTextWithAi } from "@/lib/actions/rules";
import { X, Sparkles, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  onClose,
}: RuleDialogProps) {
  const [isSaving, startSaveTransition] = useTransition();
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: rule?.id ?? 0,
    subId: rule?.sub_id ?? 0,
    sectionId: rule?.section_id ?? defaultSectionId ?? 1,
    ruleTypeId: rule?.rule_type_id ?? defaultTypeId ?? 1,
    decisionBodyId: rule?.decision_body_id ?? null as number | null,
    decisionDate: rule?.decision_date
      ? new Date(rule.decision_date).toISOString().split("T")[0]
      : "",
    persona: rule?.persona ?? "",
    text: rule?.text ?? "",
    categoryIds: rule?.rule_applies_to.map((r) => r.applies_to_id) ?? [],
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className={`flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl sm:max-h-[90vh] lg:flex-row ${aiResponse ? "lg:max-w-6xl" : "lg:max-w-2xl"} transition-all`}>

        {/* Left: Form */}
        <div className="flex min-w-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {mode === "add" ? "Добавить правило" : "Редактировать правило"}
          </h2>

          <div className="space-y-4">
            {/* ID and Sub-ID */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Пункт</label>
                <input
                  type="number"
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: Number(e.target.value) })
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Подпункт</label>
                <input
                  type="number"
                  value={formData.subId}
                  onChange={(e) =>
                    setFormData({ ...formData, subId: Number(e.target.value) })
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Section and Type (only for add mode of organizational rules) */}
            {mode === "add" && groupId === 1 && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium">Раздел</label>
                  <select
                    value={formData.sectionId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sectionId: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}. {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium">Тип</label>
                  <select
                    value={formData.ruleTypeId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ruleTypeId: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {ruleTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}. {t.name}
                      </option>
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
                  onChange={(e) =>
                    setFormData({ ...formData, persona: e.target.value })
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="ФИО"
                />
              </div>
            )}

            {/* Decision body and date */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">
                  Орган решения
                </label>
                <select
                  value={formData.decisionBodyId ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      decisionBodyId: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Не указано</option>
                  {decisionBodies.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">
                  Дата решения
                </label>
                <input
                  type="date"
                  value={formData.decisionDate}
                  onChange={(e) =>
                    setFormData({ ...formData, decisionDate: e.target.value })
                  }
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
                onChange={(e) =>
                  setFormData({ ...formData, text: e.target.value })
                }
                rows={8}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Введите текст правила..."
              />
            </div>

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
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            {/* Left: archive + delete (edit mode, admin only) */}
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
                    {rule?.status_id === 1 ? "Архивировать" : "Восстановить"}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Удалить
                  </button>
                </>
              )}
            </div>

            {/* Right: cancel + save */}
            <div className="flex gap-3">
              <button
                onClick={() => onClose()}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving
                  ? "Сохраняю..."
                  : mode === "add"
                    ? "Добавить"
                    : "Сохранить"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Response */}
        {aiResponse && (
          <div className="flex max-h-[40vh] shrink-0 flex-col border-t bg-blue-50 lg:max-h-none lg:w-[400px] lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-blue-200 px-4 py-3">
              <span className="text-sm font-semibold text-blue-700">Ответ ИИ</span>
              <button
                onClick={() => setAiResponse(null)}
                className="rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div
                className="text-sm leading-relaxed text-gray-800"
                dangerouslySetInnerHTML={{ __html: formatAiResponse(aiResponse) }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
