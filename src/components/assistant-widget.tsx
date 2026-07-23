"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AssistantWidget() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  if (status !== "authenticated") return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "The assistant failed to respond");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setError("The assistant failed to respond");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-96 w-80 flex-col overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-violet-200/50 to-violet-100/10 shadow-2xl backdrop-blur-md dark:border-white/15 dark:from-violet-400/20 dark:to-violet-300/5">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/40 px-4 font-medium dark:border-white/10">
            <span>Assistant</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="text-black/50 dark:text-white/50"
            >
              <CloseIcon />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 && (
              <p className="text-sm text-black/50 dark:text-white/50">
                Ask me anything about your trips or travel in general.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-foreground text-background"
                    : "bg-background/70 dark:bg-black/20"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-xl bg-background/70 px-3 py-2 text-sm text-black/50 dark:bg-black/20 dark:text-white/50">
                Thinking...
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <form
            onSubmit={handleSend}
            className="flex shrink-0 gap-2 border-t border-white/40 p-3 dark:border-white/10"
          >
            <input
              className="flex-1 rounded-xl border border-black/10 bg-background px-3 py-2 text-sm dark:border-white/20"
              placeholder="Message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-xl bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-violet-200 to-violet-100 shadow-2xl backdrop-blur-md dark:border-white/15 dark:from-violet-400/40 dark:to-violet-300/20"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
