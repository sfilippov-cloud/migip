"use client";

import { useEffect, useRef } from "react";
import "@n8n/chat/style.css";

interface AiPanelProps {
  userId: string;
  userType?: string;
}

export function AiPanel({ userId, userType = "public" }: AiPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void) | undefined;

    import("@n8n/chat").then(({ createChat }) => {
      if (!containerRef.current) return;

      const app = createChat({
        webhookUrl: "/api/ai/chat",
        target: containerRef.current,
        mode: "fullscreen",
        showWelcomeScreen: false,
        showWindowCloseButton: false,
        sessionId: `migip-${userId}`,
        initialMessages: [
          "Здравствуйте! Я ИИ ассистент МИГИПа. Задайте мне вопрос о правилах.",
        ],
        metadata: {
          user_type: userType,
        },
        i18n: {
          en: {
            title: "ИИ Ассистент",
            subtitle: "Задайте вопрос о правилах МИГИПа",
            footer: "",
            getStarted: "Начать",
            inputPlaceholder: "Введите вопрос...",
            closeButtonTooltip: "Закрыть",
          },
        },
      });

      cleanup = () => {
        app.unmount();
      };
    });

    return () => {
      cleanup?.();
    };
  }, [userId, userType]);

  return <div ref={containerRef} className="ai-chat-panel h-full" />;
}
