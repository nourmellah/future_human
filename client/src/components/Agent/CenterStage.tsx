import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Send, Volume2, Zap } from "lucide-react";
import { createPortal } from "react-dom";
import LoadingOverlay from "../LoadingOverlay";

const ACCENT = "#E7E31B";
const DURATION = 200; // ms

/* =============================================================
 * Types
 * ============================================================= */
export type CenterStageProps = {
  /** Background image/video/canvas placeholder. You can replace the <img> with a canvas later. */
  bg?: string;
  /** Optionally disable the chat bar */
  showChat?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void; // optional callback
  saving?: boolean;                  // show the blur overlay
  savingText?: string;               // optional custom text
  /** Optional controlled messages to display (for simulations) */
  messages?: ChatMessage[];
  /** Optional external handler to send a new message */
  onSendMessage?: (text: string) => void;
};

/** Message status for bubble border color. */
export type MessageStatus = "normal" | "pending" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: MessageStatus;
  error?: string; // optional per-message error, shown bottom-right
};

/* =============================================================
 * Reusable UI: MessageBubble
 * ============================================================= */
export function MessageBubble({
  msg,
  className = "",
}: {
  msg: ChatMessage;
  className?: string;
}) {
  const border =
    msg.status === "pending"
      ? "border-yellow-400"
      : msg.status === "error"
        ? "border-red-500"
        : "border-[#e5e7eb]"; // neutral like gray-200

  const align = msg.role === "user" ? "ml-auto" : "mr-auto";

  return (
    <div className={`relative max-w-[85%] ${align} ${className}`}>
      <div
        className={`bg-white text-black border ${border} rounded-2xl px-3 py-2 text-sm shadow-sm`}
      >
        {msg.text}
      </div>
      {msg.error && (
        <div className="absolute right-1 -bottom-4 text-[11px] text-red-500">
          {msg.error}
        </div>
      )}
    </div>
  );
}

/* =============================================================
 * Reusable UI: ConversationPane
 * - Stack of bubbles anchored bottom-right like the mock
 * ============================================================= */
export function ConversationPane({
  messages,
  className = "",
}: {
  messages: ChatMessage[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Subtle top fade using CSS mask so bubbles fade near the top
  const maskStyle: React.CSSProperties = {
    WebkitMaskImage:
      "linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 0px))",
    maskImage:
      "linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 0px))",
  };

  return (
    <div
      className={`relative w-[380px] max-w-[85vw] max-h-[50%] overflow-hidden ${className}`}
      aria-label="Conversation"
    >
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto p-3 pr-4 space-y-3"
        style={maskStyle}
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        <div className="h-6" />
      </div>
    </div>
  );
}

/* =============================================================
 * Reusable UI: ComposeBar
 * - Bottom centered bar with input, Send (yellow), Mic
 * ============================================================= */
export function ComposeBar({
  value,
  onChange,
  onSend,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  className?: string;
}) {
  return (
    <div
      className={`absolute bottom-4 right-4 w-[420px] max-w-[85vw] ${className}`}
      aria-label="Compose message"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) onSend();
          }}
          placeholder="Type a message…"
          className="flex-1 h-10 px-3 rounded-xl bg-white text-black placeholder:text-gray-500 outline-none"
        />

        <button
          type="button"
          onClick={onSend}
          className="grid place-items-center w-9 h-9 rounded-full"
          style={{ backgroundColor: "#E7E31B", color: "#000" }}
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>

        <button
          type="button"
          className="grid place-items-center w-9 h-9 rounded-full bg-black/30 border border-[#222]"
          title="Voice"
        >
          <Volume2 className="w-4 h-4 text-white" />
        </button>
      </div>

    </div>
  );
}


/* =============================================================
 * Stage content (image background + overlays)
 * ============================================================= */
function StageContent({
  bg,
  messages,
  composerValue,
  onComposerChange,
  onComposerSend,
  showChat,
}: {
  bg?: string;
  messages: ChatMessage[];
  composerValue: string;
  onComposerChange: (v: string) => void;
  onComposerSend: () => void;
  showChat?: boolean;
}) {
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden bg-black">
      {/* Background – swap with canvas/video later */}
      {bg ? (
        <img
          src={bg}
          alt="center-stage"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b0b] to-[#111]" />
      )}

      {/* Conversation pane (bottom-right like the mock) */}
      <div className="absolute bottom-28 right-4">
        <ConversationPane messages={messages} />
      </div>

      {/* Chat compose bar (bottom, centered) */}
      {showChat && (
        <ComposeBar
          value={composerValue}
          onChange={onComposerChange}
          onSend={onComposerSend}
        />
      )}
    </div>
  );
}

/* =============================================================
 * Fullscreen portal shell
 * ============================================================= */
function FullscreenPortal({ children, active }: { children: React.ReactNode; active: boolean }) {
  const [mounted, setMounted] = React.useState(active);
  const [visible, setVisible] = React.useState(active);

  React.useEffect(() => {
    if (active) {
      setMounted(true);
      // next frame → enable transitions
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 250); // keep mounted for fade-out
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] bg-black/90 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"
        }`}
    >
      <div
        className={`absolute inset-0 p-3 sm:p-6 transition-transform duration-300 ${visible ? "scale-100" : "scale-95"
          }`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* =============================================================
 * Main component
 * ============================================================= */
export default function CenterStage({
  bg,
  showChat = true,
  onFullscreenChange,
  saving,
  savingText: creatingText,
  messages: controlledMessages,
  onSendMessage,
}: CenterStageProps) {
  // --- local demo chat state (used if no controlled messages provided) ---
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([
    { id: "m1", role: "assistant", text: "Hello! I’m your assistant." },
    { id: "m2", role: "user", text: "Can you help me set the scene?" },
  ]);
  const [draft, setDraft] = useState("");

  const messages = localMessages;

  // --- fullscreen toggle ---
  const [fsActive, setFsActive] = useState(false);
  useEffect(() => onFullscreenChange?.(fsActive), [fsActive, onFullscreenChange]);

  function handleSend() {
    if (!draft.trim()) return;

    if (onSendMessage) {
      // controlled mode: delegate send
      onSendMessage(draft.trim());
      setDraft("");
      return;
    }

    // uncontrolled demo mode
    const id = Math.random().toString(36).slice(2, 9);
    setLocalMessages((prev) => [
      ...prev,
      { id, role: "user", text: draft.trim(), status: "pending" as const },
    ]);
    setDraft("");

    // Simulate success/error completion
    setTimeout(() => {
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? Math.random() < 0.85
              ? { ...m, status: "normal" as const }
              : { ...m, status: "error" as const, error: "Network error" }
            : m
        )
      );
    }, 700);
  }

  // --- stage shell ---
  const stage = (
    <div className="relative h-full w-full">
      <StageToolbar
        fsActive={fsActive}
        onToggleFs={() => setFsActive((v) => !v)}
      />
      <StageContent
        bg={bg}
        messages={messages}
        composerValue={draft}
        onComposerChange={setDraft}
        onComposerSend={handleSend}
        showChat={showChat}
      />

      {/* Creating overlay */}
      {saving && (
        <div className="absolute inset-0 z-20">
          <LoadingOverlay alt={creatingText ?? "Creating…"} />
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full">
      {/* Normal (embedded) view */}
      {!fsActive && <div className="h-full w-full">{stage}</div>}

      {/* Fullscreen view */}
      <FullscreenPortal active={fsActive}>{stage}</FullscreenPortal>
    </div>
  );
}

/* =============================================================
 * Toolbar
 * ============================================================= */
function StageToolbar({
  fsActive,
  onToggleFs,
}: {
  fsActive: boolean;
  onToggleFs: () => void;
}) {
  return (
    <div className="absolute z-10 inset-x-0 top-3 flex items-center justify-between px-3">
      {/* Left group: lightning + volume (like the mock) */}
      <div className="flex items-center gap-2">
        <div className="grid place-items-center w-10 h-10 rounded-full bg-black/30 border border-[#222] text-white">
          <Zap className="w-5 h-5" />
        </div>
        <div className="grid place-items-center w-10 h-10 rounded-full bg-black/30 border border-[#222] text-white">
          <Volume2 className="w-5 h-5" />
        </div>
      </div>

      {/* Right: fullscreen toggle */}
      <button
        type="button"
        onClick={onToggleFs}
        className="grid place-items-center w-10 h-10 rounded-full bg-black/30 border border-[#222] text-white"
        title={fsActive ? "Minimize" : "Maximize"}
      >
        {fsActive ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>
    </div>
  );
}
