"use client";

import { X, Download } from "lucide-react";

interface DocPreviewPanelProps {
  documentId: number;
  title: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
}

function isPreviewable(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType.startsWith("image/")
  );
}

export function DocPreviewPanel({
  documentId,
  title,
  fileName,
  mimeType,
  onClose,
}: DocPreviewPanelProps) {
  const rawPreviewUrl = `/api/documents/${documentId}/preview`;
  const previewUrl = mimeType === "application/pdf"
    ? `${rawPreviewUrl}#toolbar=0&navpanes=0`
    : rawPreviewUrl;
  const downloadUrl = `/api/documents/${documentId}/download`;
  const canPreview = isPreviewable(mimeType);

  return (
    <>
      {/* Mobile: fullscreen overlay */}
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white lg:hidden">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{title}</span>
            <span className="block truncate text-xs text-gray-400">{fileName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={downloadUrl}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Скачать"
            >
              <Download className="h-4 w-4" />
            </a>
            <button onClick={onClose} className="rounded p-1.5 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          {mimeType.startsWith("image/") ? (
            <div className="flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={title} className="max-w-full" />
            </div>
          ) : canPreview ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <p className="text-sm text-gray-500">Нажмите, чтобы открыть документ</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Открыть
              </a>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
              >
                <Download className="h-4 w-4" /> Скачать файл
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
              <p className="text-sm">Предпросмотр недоступен для этого типа файла</p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" /> Скачать файл
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: side panel */}
      <div className="hidden shrink-0 flex-col overflow-hidden rounded-lg border lg:flex lg:w-[550px]">
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{title}</span>
            <span className="block truncate text-xs text-gray-400">{fileName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={downloadUrl}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Скачать"
            >
              <Download className="h-4 w-4" />
            </a>
            <button onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50">
          {canPreview ? (
            mimeType.startsWith("image/") ? (
              <div className="flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={title} className="max-w-full" />
              </div>
            ) : (
              <iframe src={previewUrl} className="h-full w-full" title={title} />
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
              <p className="text-sm">Предпросмотр недоступен для этого типа файла</p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" /> Скачать файл
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
