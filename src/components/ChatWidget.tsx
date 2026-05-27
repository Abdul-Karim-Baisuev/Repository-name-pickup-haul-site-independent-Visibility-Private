import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "pickuphaul_chat_session";
const HISTORY_KEY = "pickuphaul_chat_history";

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi! 👋 I'm the **PICKUP HAUL** assistant. Ask me about our fleet, what fits in the Tacoma vs the Camry, service area, insurance — or tell me what you need to haul and I'll help you start a quote.",
};

const getOrCreateSessionId = (): string => {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh =
      "s_" +
      (crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
};

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState<string>(() => getOrCreateSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load persisted history on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed: Msg[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      /* noop */
    }
  }, []);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* noop */
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-widget", {
        body: { message: text, sessionId },
      });

      if (error || !data?.reply) {
        const errMsg = (data as { error?: string } | null)?.error || error?.message || "";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errMsg
              ? `⚠️ ${errMsg}`
              : "⚠️ Sorry, I couldn't reach the assistant. Please text us on WhatsApp at **(747) 370-6885** or fill the **Request a Quote** form.",
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: String(data.reply) }]);
      }
    } catch (e) {
      console.error("chat-widget error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Connection issue. Please try again in a moment, or text us on WhatsApp at **(747) 370-6885**.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setMessages([WELCOME]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      {/* Floating launcher — bottom-LEFT to avoid conflict with FloatingSocials */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="fixed left-4 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:left-6 md:bottom-8 z-40 group flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-[0_15px_45px_-12px_hsl(var(--primary)/0.7)] ring-1 ring-primary/40 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:shadow-[0_20px_55px_-10px_hsl(var(--primary)/0.85)] active:scale-95"
      >
        {!open && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-25" />
        )}
        {!open && (
          <span className="absolute left-full ml-3 hidden md:block whitespace-nowrap rounded-full bg-card/95 px-3 py-1.5 text-[11px] font-medium text-foreground ring-1 ring-border backdrop-blur-md shadow-lg">
            Ask AI assistant
          </span>
        )}
        <span
          className="relative z-10 transition-transform duration-300"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          {open ? <X className="h-6 w-6" strokeWidth={2.4} /> : <Sparkles className="h-6 w-6" strokeWidth={2.2} />}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="AI Assistant"
          className="fixed left-2 right-2 bottom-[calc(14.25rem+env(safe-area-inset-bottom))] md:left-6 md:right-auto md:bottom-28 md:w-[400px] z-40 flex flex-col h-[70vh] max-h-[600px] rounded-3xl bg-card/95 ring-1 ring-border shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.4)] backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/30">
                <Bot className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="font-heading text-sm uppercase tracking-wider text-foreground truncate">
                  Pickup Haul AI
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online · Replies instantly
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={reset}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
                aria-label="Reset conversation"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.5)]"
                      : "bg-secondary/60 text-foreground ring-1 ring-border rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_strong]:text-primary [&_a]:text-primary [&_a]:underline">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap break-words">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary/60 ring-1 ring-border rounded-2xl rounded-bl-sm px-3.5 py-2.5 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 bg-background/40">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Ask anything about hauling…"
                className="flex-1 resize-none rounded-xl bg-secondary/40 ring-1 ring-border focus:ring-primary/60 focus:outline-none px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all max-h-32"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={send}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2.4} />
                )}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground text-center">
              AI assistant · For confirmed estimates use the{" "}
              <a href="/#quote" className="text-primary hover:underline">
                Request a Quote
              </a>{" "}
              form
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
