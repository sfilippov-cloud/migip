"use client";

import { useState, useTransition } from "react";
import {
  linkDocumentToRule,
  unlinkDocumentFromRule,
} from "@/lib/actions/documents";
import { FileText, X, Plus, ChevronDown, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";

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

interface RuleDocumentLinksProps {
  ruleUid: number;
  linkedDocuments: LinkedDocument[];
  allDocuments: DocumentSummary[];
}

export function RuleDocumentLinks({
  ruleUid,
  linkedDocuments: initialLinked,
  allDocuments,
}: RuleDocumentLinksProps) {
  const [isPending, startTransition] = useTransition();
  const [linked, setLinked] = useState<LinkedDocument[]>(initialLinked);
  const [expanded, setExpanded] = useState(initialLinked.length > 0);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const linkedIds = new Set(linked.map((d) => d.id));
  const availableDocuments = allDocuments.filter(
    (d) => !linkedIds.has(d.id)
  );

  const filteredAvailable = searchQuery
    ? availableDocuments.filter((d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableDocuments;

  function handleLink(documentId: number) {
    const doc = allDocuments.find((d) => d.id === documentId);
    if (!doc) return;

    // Optimistic update
    setLinked((prev) => [...prev, doc]);
    setShowPicker(false);
    setSearchQuery("");

    startTransition(async () => {
      try {
        await linkDocumentToRule(documentId, ruleUid);
        toast.success("Документ привязан");
      } catch {
        // Revert on error
        setLinked((prev) => prev.filter((d) => d.id !== documentId));
        toast.error("Ошибка при привязке документа");
      }
    });
  }

  function handleUnlink(documentId: number) {
    const removed = linked.find((d) => d.id === documentId);

    // Optimistic update
    setLinked((prev) => prev.filter((d) => d.id !== documentId));

    startTransition(async () => {
      try {
        await unlinkDocumentFromRule(documentId, ruleUid);
        toast.success("Документ отвязан");
      } catch {
        // Revert on error
        if (removed) setLinked((prev) => [...prev, removed]);
        toast.error("Ошибка при отвязке документа");
      }
    });
  }

  function formatDate(date: Date | null): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ru-RU");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mb-2 flex items-center gap-1.5 text-sm font-medium"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Документы
        {linked.length > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
            {linked.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2">
          {linked.length === 0 && !showPicker && (
            <p className="text-xs text-gray-400">Нет привязанных документов</p>
          )}

          {linked.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{doc.title}</div>
                {(doc.decision_body || doc.decision_date) && (
                  <div className="truncate text-xs text-gray-400">
                    {[doc.decision_body?.code, formatDate(doc.decision_date)]
                      .filter(Boolean)
                      .join(" от ")}
                  </div>
                )}
              </div>
              <a
                href={`/api/documents/${doc.id}/download`}
                className="rounded p-1 text-gray-400 hover:text-gray-700"
                title="Скачать"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => handleUnlink(doc.id)}
                disabled={isPending}
                className="rounded p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                title="Отвязать"
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
                {filteredAvailable.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-gray-400">
                    {availableDocuments.length === 0
                      ? "Все документы уже привязаны"
                      : "Ничего не найдено"}
                  </p>
                ) : (
                  filteredAvailable.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleLink(doc.id)}
                      disabled={isPending}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPicker(false);
                  setSearchQuery("");
                }}
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
              <Plus className="h-3 w-3" /> Привязать документ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
