// src/components/create/ConnectionsForm.tsx
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus, X, Settings, Search,
  Facebook, MessageCircle, Mail, Calendar, ShoppingBag, Globe
} from "lucide-react";
import type { Connection } from "../../../state/agentWizard";

const ACCENT = "#E7E31B";

/* -------------------- Types -------------------- */
type Category = "social" | "email" | "calendar" | "commerce" | "messaging" | "automation" | "other";

export type ProviderId =
  | "facebook"
  | "whatsapp"
  | "gmail"
  | "google_calendar"
  | "shopify"
  | "webhook";

export type ProviderMeta = {
  id: ProviderId;
  name: string;
  icon: React.ReactNode;
  category: Category;
  description?: string;
  auth: "oauth" | "apiKey" | "webhook" | "none";
  startAuth?: () => Promise<{ token?: string }>;
  getConfigSchema?: (() => Promise<Array<{ name: string; label: string; type?: "text" | "secret" }>>) | Array<{ name: string; label: string; type?: "text" | "secret" }>;
};

export type ConnectionsFormProps = {
  /** Initial seed (from parent store). Used once. */
  initial?: Connection[];
  /** Called when the user adds/removes/configures connections. */
  onChange?: (items: Connection[]) => void;
};

/* -------------------- Provider registry -------------------- */
const PROVIDERS: ProviderMeta[] = [
  {
    id: "facebook",
    name: "Facebook",
    icon: <Facebook className="w-5 h-5" />,
    category: "social",
    description: "Pages & Insights",
    auth: "oauth",
    startAuth: async () => ({ token: "mock_facebook_token" }),
    getConfigSchema: [{ name: "pageId", label: "Page ID" }],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: <MessageCircle className="w-5 h-5" />,
    category: "messaging",
    description: "Send & receive messages",
    auth: "apiKey",
    getConfigSchema: [{ name: "apiKey", label: "API Key", type: "secret" }],
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: <Mail className="w-5 h-5" />,
    category: "email",
    description: "Send email",
    auth: "oauth",
    startAuth: async () => ({ token: "mock_gmail_token" }),
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    icon: <Calendar className="w-5 h-5" />,
    category: "calendar",
    description: "Read/write events",
    auth: "oauth",
    startAuth: async () => ({ token: "mock_calendar_token" }),
  },
  {
    id: "shopify",
    name: "Shopify",
    icon: <ShoppingBag className="w-5 h-5" />,
    category: "commerce",
    description: "Orders & products",
    auth: "apiKey",
    getConfigSchema: [
      { name: "store", label: "Store URL" },
      { name: "accessToken", label: "Access Token", type: "secret" },
    ],
  },
  {
    id: "webhook",
    name: "Webhook",
    icon: <Globe className="w-5 h-5" />,
    category: "automation",
    description: "Generic HTTP webhook",
    auth: "webhook",
    getConfigSchema: [{ name: "url", label: "Webhook URL" }],
  },
];

/* -------------------- Utilities -------------------- */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* -------------------- Modal shell -------------------- */
function Modal({
  open,
  onClose,
  children,
  widthClass = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className={`w-full ${widthClass} rounded-2xl bg-[#0b0b0b] border border-[#222] p-4`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* -------------------- Catalog modal -------------------- */
function CatalogModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (p: ProviderMeta) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const items = useMemo(() => {
    return PROVIDERS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        p.id.includes(q)
      );
    });
  }, [query, category]);

  const categories: Array<{ key: Category | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "social", label: "Social" },
    { key: "messaging", label: "Messaging" },
    { key: "email", label: "Email" },
    { key: "calendar", label: "Calendar" },
    { key: "commerce", label: "Commerce" },
    { key: "automation", label: "Automation" },
    { key: "other", label: "Other" },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      {/* Header with title, search, and a Close button */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-lg font-extrabold text-white">Add Connection</div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/60" />
            <input
              className="w-full rounded-full bg-[#111] text-white pl-9 pr-3 py-2 outline-none border border-[#222]"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* NEW: Close button */}
          <button
            onClick={onClose}
            aria-label="Close add connections"
            className="grid place-items-center w-9 h-9 rounded-full bg-[#111] border border-[#222] text-white hover:bg-[#151515]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>


      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((c) => (
          <button
            key={c.key}
            className={`px-3 py-1 rounded-full text-sm border ${category === c.key ? "text-black" : "text-white"
              }`}
            style={{
              backgroundColor: category === c.key ? ACCENT : "transparent",
              borderColor: "#222",
            }}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="flex items-center gap-3 rounded-2xl border p-3 text-left hover:bg-[#111]"
            style={{ borderColor: "#222", backgroundColor: "#0b0b0b" }}
          >
            <div className="grid place-items-center w-8 h-8 rounded-full bg-black/40">{p.icon}</div>
            <div className="flex-1">
              <div className="text-white font-semibold leading-tight">{p.name}</div>
              {p.description ? <div className="text-xs text-gray-400">{p.description}</div> : null}
            </div>
            <span
              className="px-2 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: ACCENT, color: "#000" }}
            >
              Add
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* -------------------- Config modal -------------------- */
function ConfigModal({
  open,
  onClose,
  provider,
  values,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  provider: ProviderMeta | null;
  values: Record<string, string>;
  onSave: (v: Record<string, string>) => void;
}) {
  const [schema, setSchema] = React.useState<Array<{ name: string; label: string; type?: "text" | "secret" }>>([]);
  const [form, setForm] = React.useState<Record<string, string>>(values);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!provider) return;
      const raw = provider.getConfigSchema;
      let s: Array<{ name: string; label: string; type?: "text" | "secret" }> | undefined;
      if (typeof raw === "function") {
        s = await raw();
      } else {
        s = raw;
      }
      if (!cancelled) setSchema(Array.isArray(s) ? s : []);
    })();
    setForm(values);
    return () => {
      cancelled = true;
    };
  }, [provider, values]);

  if (!open || !provider) return null;

  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-md">
      <div className="text-lg font-extrabold text-white mb-4">Configure {provider.name}</div>
      <div className="space-y-3">
        {schema.map((f) => (
          <label key={f.name} className="block">
            <span className="block text-xs text-gray-300 mb-1">{f.label}</span>
            <input
              type={f.type === "secret" ? "password" : "text"}
              value={form[f.name] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              className="w-full rounded-xl bg-[#111] text-white border border-[#222] px-3 py-2 outline-none"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-full border border-[#333] text-white">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-4 py-2 rounded-full font-extrabold"
          style={{ backgroundColor: ACCENT, color: "#000" }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

/* -------------------- Tiles -------------------- */
function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-2xl border border-[#222] bg-[#0b0b0b] overflow-hidden
                 grid place-items-center hover:bg-[#111]"
    >
      <div className="flex flex-col items-center justify-center gap-2 px-3 text-center">
        <div className="grid place-items-center w-10 h-10 rounded-full bg:black/40 bg-black/40 text-white">
          <Plus className="w-5 h-5" />
        </div>
        <div className="text-white font-extrabold leading-tight">
          <div>ADD</div>
          <div>CONNECTION</div>
        </div>
      </div>
    </button>
  );
}

function ConnectionTile({
  provider,
  connection,
  onRemove,
  onConfigure,
}: {
  provider: ProviderMeta;
  connection: Connection;
  onRemove: () => void;
  onConfigure: () => void;
}) {
  return (
    <div className="relative aspect-square rounded-2xl border border-[#222] bg-[#0b0b0b] overflow-hidden">
      {/* Actions pinned */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <button
          onClick={onConfigure}
          className="grid place-items-center w-7 h-7 rounded-full bg-black/40 text-white"
          title="Configure"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          className="grid place-items-center w-7 h-7 rounded-full bg-black/40 text-white"
          title="Remove"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Centered content */}
      <div className="h-full w-full grid place-items-center px-3 py-3 text-center">
        <div className="flex flex-col items-center gap-2 max-w-full">
          <div className="grid place-items-center w-10 h-10 rounded-full bg-black/40">
            {provider.icon}
          </div>
          <div className="text-white font-semibold leading-tight truncate max-w-[90%]" title={provider.name}>
            {provider.name}
          </div>
          <div
            className="text-xs text-gray-400 truncate max-w-[90%]"
            title={connection.status === "connected" ? "Connected" : "Needs setup"}
          >
            {connection.status === "connected" ? "Connected" : "Needs setup"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Main Form -------------------- */
export default function ConnectionsForm({
  initial,
  onChange,
}: ConnectionsFormProps) {
  // ✅ Initialize from `initial` only once; we don't re-sync on every parent render.
  const [items, setItems] = useState<Connection[]>(() => initial ?? []);

  // Local UI state
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configTarget, setConfigTarget] = useState<{ provider: ProviderMeta; id: string } | null>(null);

  // Provider lookups
  const catalogById = useMemo(() => Object.fromEntries(PROVIDERS.map((p) => [p.id, p])), []);

  /* ---------- User-intent actions (these are the ONLY places we call onChange) ---------- */
  async function handlePickProvider(p: ProviderMeta) {
    setCatalogOpen(false);

    // Try OAuth/API handshake (stubbed)
    let token: string | undefined;
    try {
      token = (await p.startAuth?.())?.token;
    } catch {
      // ignore
    }

    const newConn: Connection = {
      id: uid(),
      providerId: p.id,
      token,
      status: token ? "connected" : "needs_setup",
    };

    setItems((prev) => {
      const next = [newConn, ...prev];
      onChange?.(next);
      return next;
    });

    // If provider requires config, open modal
    if (!token || p.getConfigSchema) {
      setConfigTarget({ provider: p, id: newConn.id });
      setConfigOpen(true);
    }
  }

  function openConfig(c: Connection) {
    const provider = catalogById[c.providerId];
    if (!provider) return;
    setConfigTarget({ provider, id: c.id });
    setConfigOpen(true);
  }

  function saveConfig(values: Record<string, string>) {
    if (!configTarget) return;
    setItems((prev) => {
      const next = prev.map((c) =>
        c.id === configTarget.id ? { ...c, config: values, status: c.status || "needs_setup" } : c
      );
      onChange?.(next);
      return next;
    });
    setConfigOpen(false);
    setConfigTarget(null);
  }

  function removeConnection(id: string) {
    setItems((prev) => {
      const next = prev.filter((c) => c.id !== id);
      onChange?.(next);
      return next;
    });
  }

  return (
    <div className="text-white">
      {/* Title */}
      <section className="flex flex-col gap-4">

        {/* Step title */}
        <h3 className="text-xl font-extrabold leading-tight">
          Step 6: Connections
        </h3>

        {/* Banner image */}
        <img
          src={"/public/assets/agent/banners/step-6.png"}
          alt="Give your Future Human a special style"
          className="block w-full rounded-3xl mt-0 mb-5"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      </section>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        <AddTile onClick={() => setCatalogOpen(true)} />
        {items.map((c) => {
          const provider = catalogById[c.providerId];
          if (!provider) return null;
          return (
            <ConnectionTile
              key={c.id}
              provider={provider}
              connection={c}
              onConfigure={() => openConfig(c)}
              onRemove={() => removeConnection(c.id)}
            />
          );
        })}
      </div>

      {/* Modals */}
      <CatalogModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onPick={handlePickProvider}
      />
      <ConfigModal
        open={configOpen}
        onClose={() => {
          setConfigOpen(false);
          setConfigTarget(null);
        }}
        provider={configTarget?.provider ?? null}
        values={
          configTarget
            ? items.find((i) => i.id === configTarget.id)?.config ?? {}
            : {}
        }
        onSave={saveConfig}
      />
    </div>
  );
}
