"use client";

import { useState, useTransition } from "react";
import { createRule, updateRule, improveTextWithAi } from "@/lib/actions/rules";
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
  defaultSectionId?: number;
  defaultTypeId?: number;
  onClose: () => void;
}

export function RuleDialog({
  mode,
  rule,
  sections,
  ruleTypes,
  decisionBodies,
  categories,
  groupId,
  defaultSectionId,
  defaultTypeId,
  onClose,
}: RuleDialogProps) {
  const [isPending, startTransition] = useTransition();
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

    startTransition(async () => {
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
        onClose();
      } catch {
        toast.error("Ошибка при сохранении");
      }
    });
  }

  function handleAiCheck() {
    startTransition(async () => {
      const result = await improveTextWithAi(formData.text);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAiResponse(JSON.stringify(result.result, null, 2));
      }
    });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
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
                disabled={isPending || !formData.text.trim()}
                className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
              >
                {isPending ? "Проверяю..." : "Проверить ИИ"}
              </button>
            </div>
            <textarea
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
              rows={6}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Введите текст правила..."
            />
          </div>

          {/* AI Response */}
          {aiResponse && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="mb-1 text-xs font-medium text-blue-700">
                Ответ ИИ:
              </p>
              <pre className="whitespace-pre-wrap text-sm">{aiResponse}</pre>
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
        </div>

        {/* Actions */}
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
                ? "Добавить"
                : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
