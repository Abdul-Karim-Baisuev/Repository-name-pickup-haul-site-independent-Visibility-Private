import { useEffect, useRef, useState } from "react";
import { Facebook, Instagram, MessageCircle, Send, Share2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61588208545988";
const INSTAGRAM_URL =
  "https://www.instagram.com/autobais?igsh=NTc4MTIwNjQ2YQ%3D%3D&utm_source=qr";
const WHATSAPP_PHONE = "17473706885";
const DEFAULT_WA_MESSAGE = "Hi! I'd like to ask about a pickup truck hauling job.";

type SocialKey = "whatsapp" | "facebook" | "instagram";

const externalSocials: { key: Exclude<SocialKey, "whatsapp">; name: string; href: string; icon: typeof Facebook; label: string }[] = [
  {
    key: "facebook",
    name: "Facebook",
    href: FACEBOOK_URL,
    icon: Facebook,
    label: "Visit our Facebook page",
  },
  {
    key: "instagram",
    name: "Instagram",
    href: INSTAGRAM_URL,
    icon: Instagram,
    label: "Visit our Instagram profile",
  },
];

const FloatingSocials = () => {
  const [open, setOpen] = useState(false);
  const [waEditorOpen, setWaEditorOpen] = useState(false);
  const [waTemplate, setWaTemplate] = useState<string>(DEFAULT_WA_MESSAGE);
  const [waMessage, setWaMessage] = useState<string>(DEFAULT_WA_MESSAGE);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load template from app_settings (public read for this key)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "whatsapp_message_template")
        .maybeSingle();
      if (cancelled) return;
      const value = data?.value?.trim();
      if (value) {
        setWaTemplate(value);
        setWaMessage(value);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open && !waEditorOpen) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setWaEditorOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setWaEditorOpen(false);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, waEditorOpen]);

  useEffect(() => {
    if (waEditorOpen) {
      // Reset to latest template each time editor opens
      setWaMessage(waTemplate);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [waEditorOpen, waTemplate]);

  const openWhatsApp = () => {
    const text = waMessage.trim() || waTemplate;
    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setWaEditorOpen(false);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed right-4 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:right-6 md:bottom-8 z-40 flex flex-col items-end gap-3"
    >
      {/* WhatsApp editor popover */}
      {waEditorOpen && (
        <div className="w-[min(88vw,320px)] rounded-2xl bg-card/95 ring-1 ring-border shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.4)] backdrop-blur-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                <MessageCircle className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <span className="text-sm font-semibold text-foreground">WhatsApp message</span>
            </div>
            <button
              type="button"
              onClick={() => setWaEditorOpen(false)}
              aria-label="Close editor"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Edit your message before opening WhatsApp.
          </p>
          <textarea
            ref={textareaRef}
            value={waMessage}
            onChange={(e) => setWaMessage(e.target.value.slice(0, 600))}
            rows={4}
            className="w-full resize-none rounded-lg bg-background/60 ring-1 ring-border focus:ring-primary/60 focus:outline-none px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all"
            placeholder={DEFAULT_WA_MESSAGE}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <button
              type="button"
              onClick={() => setWaMessage(waTemplate)}
              className="hover:text-foreground transition-colors"
            >
              Reset to default
            </button>
            <span>{waMessage.length}/600</span>
          </div>
          <button
            type="button"
            onClick={openWhatsApp}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold shadow-[0_10px_25px_-10px_hsl(var(--primary)/0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Send className="h-4 w-4" strokeWidth={2.4} />
            Open WhatsApp
          </button>
        </div>
      )}

      {/* Social children */}
      <div
        className={`flex flex-col items-center gap-3 self-center transition-all duration-300 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        {/* WhatsApp - opens editor */}
        <button
          type="button"
          onClick={() => setWaEditorOpen((v) => !v)}
          aria-label="Compose a WhatsApp message"
          aria-expanded={waEditorOpen}
          style={{ transitionDelay: open ? "0ms" : "0ms" }}
          className="group relative flex items-center justify-center h-12 w-12 rounded-full bg-card/80 text-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)] ring-1 ring-border backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:ring-primary/60 active:scale-95"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
          <span className="absolute right-full mr-3 whitespace-nowrap rounded-md bg-card/95 px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border backdrop-blur-md opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none">
            WhatsApp
          </span>
          <span className="sr-only">WhatsApp</span>
        </button>

        {externalSocials.map((s, i) => {
          const Icon = s.icon;
          return (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              style={{ transitionDelay: open ? `${(i + 1) * 60}ms` : "0ms" }}
              className="group relative flex items-center justify-center h-12 w-12 rounded-full bg-card/80 text-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)] ring-1 ring-border backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:ring-primary/60 active:scale-95"
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              <span className="absolute right-full mr-3 whitespace-nowrap rounded-md bg-card/95 px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border backdrop-blur-md opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none">
                {s.name}
              </span>
              <span className="sr-only">{s.name}</span>
            </a>
          );
        })}
      </div>

      {/* Toggle FAB */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (waEditorOpen) setWaEditorOpen(false);
        }}
        aria-expanded={open}
        aria-label={open ? "Close social menu" : "Text us — faster than calling"}
        className="group relative self-center flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] ring-1 ring-primary/40 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.8)] active:scale-95"
      >
        {!open && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-30" />
        )}
        {!open && (
          <span className="absolute right-full mr-3 hidden md:block whitespace-nowrap rounded-full bg-card/95 px-3 py-1.5 text-[11px] font-medium text-foreground ring-1 ring-border backdrop-blur-md shadow-lg">
            Text us — faster reply
          </span>
        )}
        <span
          className="relative z-10 transition-transform duration-300"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          {open ? <X className="h-6 w-6" strokeWidth={2.4} /> : <MessageCircle className="h-6 w-6" strokeWidth={2.2} />}
        </span>
      </button>
    </div>
  );
};

export default FloatingSocials;
