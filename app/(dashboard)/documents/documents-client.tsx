"use client";

import { useState, useTransition, useRef } from "react";
import {
  updateDocument,
  deleteDocument,
  retriggerDocEmbed,
} from "@/lib/actions/documents";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  FileText,
  Eye,
  X,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { DocPreviewPanel } from "@/components/doc-preview-panel";

type Document = {
  id: number;
  title: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  decision_body_id: number | null;
  decision_date: Date | null;
  status: string;
  uploaded_by: number | null;
  created_at: Date;
  decision_body: { id: number; code: string | null; name: string } | null;
};

type DecisionBody = { id: number; code: string | null; name: string };

interface DocumentsClientProps {
  documents: Document[];
  decisionBodies: DecisionBody[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU");
}

function statusBadge(status: string) {
  switch (status) {
    case "ready":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "error":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "ready":
      return "Готов";
    case "pending":
      return "Ожидание";
    case "error":
      return "Ошибка";
    default:
      return status;
  }
}

export function DocumentsClient({
  documents,
  decisionBodies,
}: DocumentsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBodyId, setFilterBodyId] = useState<number | "">("");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const filtered = documents.filter((doc) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !doc.title.toLowerCase().includes(q) &&
        !doc.file_name.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filterBodyId !== "" && doc.decision_body_id !== filterBodyId) {
      return false;
    }
    return true;
  });

  function handleDelete(docId: number) {
    if (!confirm("Вы уверены, что хотите удалить этот документ?")) return;
    startTransition(async () => {
      try {
        await deleteDocument(docId);
        toast.success("Документ удален");
      } catch {
        toast.error("Ошибка при удалении");
      }
    });
  }

  function handleReembed(docId: number) {
    startTransition(async () => {
      try {
        await retriggerDocEmbed(docId);
        toast.success("Индексация запущена");
      } catch {
        toast.error("Ошибка при индексации");
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold lg:text-2xl">Документы</h1>
        <button
          onClick={() => setShowUploadDialog(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:px-4 lg:py-2"
        >
          <Upload className="h-4 w-4" />
          Загрузить
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full rounded-md border py-1.5 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={filterBodyId}
          onChange={(e) =>
            setFilterBodyId(e.target.value ? Number(e.target.value) : "")
          }
          className="rounded-md border bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Все органы</option>
          {decisionBodies.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table + Preview Panel */}
      <div className="flex min-h-0 flex-1 gap-4">
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="mb-3 h-10 w-10" />
            <p className="text-sm">Документы не найдены</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-3 py-3 lg:px-4">Название</th>
                <th className="hidden px-4 py-3 md:table-cell">Орган</th>
                <th className="hidden px-4 py-3 sm:table-cell">Дата</th>
                <th className="hidden px-4 py-3 lg:table-cell">Размер</th>
                <th className="px-3 py-3">Статус</th>
                <th className="w-10 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 lg:px-4">
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-xs text-gray-400">{doc.file_name}</div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {doc.decision_body
                      ? `${doc.decision_body.code} — ${doc.decision_body.name}`
                      : "—"}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {formatDate(doc.decision_date)}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(doc.status)}`}
                    >
                      {statusLabel(doc.status)}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="Предпросмотр"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="Скачать"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => setEditingDoc(doc)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="Редактировать"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {(doc.mime_type === "application/pdf" || doc.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || doc.mime_type === "application/msword") && (
                      <button
                        onClick={() => handleReembed(doc.id)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        disabled={isPending}
                        title="Переиндексировать"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        disabled={isPending}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Document Preview Panel */}
      {previewDoc && (
        <DocPreviewPanel
          documentId={previewDoc.id}
          title={previewDoc.title}
          fileName={previewDoc.file_name}
          mimeType={previewDoc.mime_type}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      </div>

      {showUploadDialog && (
        <UploadDialog
          decisionBodies={decisionBodies}
          onClose={() => setShowUploadDialog(false)}
        />
      )}

      {editingDoc && (
        <EditDialog
          doc={editingDoc}
          decisionBodies={decisionBodies}
          onClose={() => setEditingDoc(null)}
        />
      )}
    </div>
  );
}

// ---- Upload Dialog ----

function UploadDialog({
  decisionBodies,
  onClose,
}: {
  decisionBodies: DecisionBody[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    decisionBodyId: "" as string,
    decisionDate: "",
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (!formData.title) {
        const name = file.name.replace(/\.[^.]+$/, "");
        setFormData((prev) => ({ ...prev, title: name }));
      }
    }
  }

  async function handleSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Выберите файл");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Введите название документа");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", formData.title);
    if (formData.decisionBodyId) {
      fd.append("decisionBodyId", formData.decisionBodyId);
    }
    if (formData.decisionDate) {
      fd.append("decisionDate", formData.decisionDate);
    }

    setIsUploading(true);
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Upload failed: ${res.status}`);
      }
      toast.success("Документ загружен");
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка при загрузке");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Загрузить документ</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* File picker */}
          <div>
            <label className="mb-1 block text-sm font-medium">Файл</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-gray-500 hover:border-primary hover:text-primary"
            >
              <Upload className="h-4 w-4 shrink-0" />
              {fileName || "PDF, DOCX, XLSX или изображение..."}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium">Название</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Название документа"
            />
          </div>

          {/* Decision body */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Орган решения
            </label>
            <select
              value={formData.decisionBodyId}
              onChange={(e) =>
                setFormData({ ...formData, decisionBodyId: e.target.value })
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

          {/* Decision date */}
          <div>
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

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isUploading ? "Загружаю..." : "Загрузить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Edit Dialog ----

function EditDialog({
  doc,
  decisionBodies,
  onClose,
}: {
  doc: Document;
  decisionBodies: DecisionBody[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    title: doc.title,
    decisionBodyId: doc.decision_body_id,
    decisionDate: doc.decision_date
      ? new Date(doc.decision_date).toISOString().split("T")[0]
      : "",
  });

  function handleSubmit() {
    if (!formData.title.trim()) {
      toast.error("Введите название документа");
      return;
    }

    startTransition(async () => {
      try {
        await updateDocument(doc.id, {
          title: formData.title,
          decisionBodyId: formData.decisionBodyId,
          decisionDate: formData.decisionDate || null,
        });
        toast.success("Документ обновлен");
        onClose();
      } catch {
        toast.error("Ошибка при сохранении");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Редактировать документ</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Название</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
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

          <div>
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

          <div className="text-xs text-gray-400">
            Файл: {doc.file_name} ({formatFileSize(doc.file_size)})
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
            {isPending ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
