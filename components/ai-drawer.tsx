"use client";

interface AiDrawerProps {
  onClose: () => void;
  userType?: string;
}

export function AiDrawer({ onClose, userType = "public" }: AiDrawerProps) {
  const chatUrl = process.env.NEXT_PUBLIC_N8N_AI_CHAT_URL;
  const iframeSrc = chatUrl
    ? `${chatUrl}?user_type=${userType}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Спросить ИИ</h3>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1">
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              className="h-full w-full border-0"
              title="AI Chat"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              AI чат не настроен
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
