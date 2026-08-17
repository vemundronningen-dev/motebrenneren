"use client";

import type { Toast } from "@/lib/useToasts";

export default function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto max-w-sm rounded-xl border border-ember/30 bg-background-raised/95 px-4 py-2.5 text-sm text-foreground shadow-lg backdrop-blur"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
