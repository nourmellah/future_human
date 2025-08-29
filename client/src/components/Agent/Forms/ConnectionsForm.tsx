// src/components/create/ConnectionsForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus, X, Settings, Search,
  Facebook, MessageCircle, Mail, Calendar, ShoppingBag, Globe
} from "lucide-react";
import {
  listConnections,
  createConnection,
  updateConnection,
  deleteConnection,
} from "../../../services/agents";
import { useParams } from "react-router-dom";
import InlineNotification from "../../Notification";

const ACCENT = "#E7E31B";

/* -------------------- Types -------------------- */
type ConnectionStatus = "connected" | "needs_setup" | "error";

type ConnectionItem = {
  id?: number | string;
  agentId?: number | string;
  providerId: string;
  extId: string;
  status?: ConnectionStatus;
  config?: any | null;
  token?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

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
  extId: string;
  name: string;
  icon: React.ReactNode;
  category: Category;
  description?: string;
  auth: "oauth" | "apiKey" | "webhook" | "none";
  startAuth?: () => Promise<{ token?: string }>;
  getConfigSchema?: (() => Promise<Array<{ name: string; label: string; type?: "text" | "secret" }>>) | Array<{ name: string; label: string; type?: "text" | "secret" }>;
};

const sameVal = (a: any, b: any) => {
  if (typeof a === "object" && typeof b === "object") {
    try { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); } catch { return a === b; }
  }
  return a === b;
};

const equalConn = (a: ConnectionItem, b: ConnectionItem) =>
  a.providerId === b.providerId &&
  a.extId === b.extId &&
  (a.status ?? "needs_setup") === (b.status ?? "needs_setup") &&
  sameVal(a.config ?? null, b.config ?? null) &&
  (a.token ?? null) === (b.token ?? null);

/* -------------------- Provider registry -------------------- */
const PROVIDERS: ProviderMeta[] = [
  {
    id: "facebook",
    extId: "facebook",
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
    extId: "whatsapp",
    name: "WhatsApp",
    icon: <MessageCircle className="w-5 h-5" />,
    category: "messaging",
    description: "Send & receive messages",
    auth: "apiKey",
    getConfigSchema: [{ name: "apiKey", label: "API Key", type: "secret" }],
  },
  {
    id: "gmail",
    extId: "gmail",
    name: "Gmail",
    icon: <Mail className="w-5 h-5" />,
    category: "email",
    description: "Send email",
    auth: "oauth",
    startAuth: async () => ({ token: "mock_gmail_token" }),
  },
  {
    id: "google_calendar",
    extId: "google_calendar",
    name: "Google Calendar",
    icon: <Calendar className="w-5 h-5" />,
    category: "calendar",
    description: "Read/write events",
    auth: "oauth",
    startAuth: async () => ({ token: "mock_calendar_token" }),
  },
  {
    id: "shopify",
    extId: "shopify",
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
    extId: "webhook",
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
  connection: ConnectionItem;
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
// -------------------- Main Form --------------------
export type ConnectionsFormProps = {
  /** Initial seed (optional; if provided we still reload from server once agentId is known) */
  initial?: ConnectionItem[];
  /** Called whenever rows change (after a successful save or local-only edit if no agentId yet) */
  onChange?: (rows: ConnectionItem[]) => void;
};

export default function ConnectionsForm({ initial, onChange }: ConnectionsFormProps) {
  const { id: routeId } = useParams();
  const agentId = (initial as any)?.agentId ?? routeId;

  // Single source of truth for what's on screen
  const [rows, setRows] = React.useState<ConnectionItem[]>(() => initial ?? []);
  // Server snapshot to compute deltas against
  const initialRef = React.useRef<ConnectionItem[]>(initial ?? []);

  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [notifMessage, setNotifMessage] = React.useState<{ title: string; description?: string; variant?: "info" | "success" | "error" | "warning" }>({ title: "", description: "", variant: "info" });
  const [showNotif, setShowNotif] = React.useState(false);

  // UI state (unchanged visuals)
  const [catalogOpen, setCatalogOpen] = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [configTarget, setConfigTarget] = React.useState<{ provider: ProviderMeta; id: string } | null>(null);

  // Provider lookups (reuse your PROVIDERS + icons)
  const catalogById = React.useMemo(
    () => Object.fromEntries(PROVIDERS.map((p) => [p.id, p])),
    []
  );

  // ---------- helpers ----------
  const canSubmit = React.useMemo(() => !loading && !submitting && !!agentId, [loading, submitting, agentId]);

  // Create a stable temp id for brand new local rows (until the server returns a real id)
  const makeTempId = (providerId: string) => `tmp:${providerId}:${Date.now()}`;

  // After we call saveConnectionsDelta(), the server returns created/updated items.
  // We merge returned ids back into our "after" array so UI stops using tmp:* IDs.
  function reconcileIds(
    after: ConnectionItem[],
    created: ConnectionItem[],
    updated: ConnectionItem[]
  ): ConnectionItem[] {
    const byProviderKey = (c: ConnectionItem) => `${c.providerId}#${c.extId}`;

    const createdMap = new Map(created.map((c) => [byProviderKey(c), c]));
    const updatedMap = new Map(updated.map((c) => [(c.id ?? byProviderKey(c)).toString(), c]));

    return after.map((row) => {
      // Prefer matching by real id if present, else providerId#extId for newly created
      if (row.id != null && updatedMap.has(row.id.toString())) {
        const srv = updatedMap.get(row.id.toString())!;
        return { ...row, id: srv.id, status: srv.status ?? row.status };
      }
      const key = byProviderKey(row);
      if ((row.id == null || String(row.id).startsWith("tmp:")) && createdMap.has(key)) {
        const srv = createdMap.get(key)!;
        return { ...row, id: srv.id, status: srv.status ?? row.status };
      }
      return row;
    });
  }

  async function applyDelta(before: ConnectionItem[], after: ConnectionItem[]) {
    // If we don't have an agentId yet, just update locally and notify parent.
    if (!agentId) {
      setRows(after);
      initialRef.current = after;
      onChange?.(after);
      return;
    }

    setSubmitting(true);
    try {
      const { created, updated } = await saveConnectionsDelta(before, after);
      const reconciled = reconcileIds(after, created, updated);
      setRows(reconciled);
      initialRef.current = reconciled;
      onChange?.(reconciled);
      setNotifMessage({ title: "Success", description: "Connections saved successfully", variant: "success" });
      setShowNotif(true);
    } catch (e) {
      console.error(e);
      setNotifMessage({ title: "Error", description: "Failed to save connections", variant: "error" });
      setShowNotif(true);
      // Do not mutate rows on failure
    } finally {
      setSubmitting(false);
    }
  }

  const saveConnectionsDelta = async (before: ConnectionItem[], after: ConnectionItem[]) => {
    const key = (c: ConnectionItem) => (c.id != null ? `id:${c.id}` : `k:${c.providerId}#${c.extId}`);

    const pre = new Map(before.map((c) => [key(c), c]));
    const cur = new Map(after.map((c) => [key(c), c]));

    const created: ConnectionItem[] = [];
    const updated: ConnectionItem[] = [];
    const deleted: (number | string)[] = [];

    // Create + Update
    for (const [k, c] of cur) {
      const prev = pre.get(k);
      if (!prev) {
        const made = await createConnection(agentId!, {
          providerId: c.providerId,
          extId: c.extId,
          status: c.status ?? "needs_setup",
          config: c.config ?? null,
          token: c.token ?? null,
        });
        created.push(made);
        continue;
      }
      if (!equalConn(prev, c) && prev.id != null) {
        const up = await updateConnection(agentId!, prev.id, {
          providerId: c.providerId,
          extId: c.extId,
          status: c.status,
          config: c.config,
          token: c.token,
        });
        updated.push(up);
      }
    }

    // Delete
    for (const [k, c] of pre) {
      if (!cur.has(k) && c.id != null) {
        await deleteConnection(agentId!, c.id);
        deleted.push(c.id);
      }
    }

    return { created, updated, deleted };
  };

  // ---------- lifecycle ----------
  // Reload from server when agentId becomes known or changes
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!agentId) return;
      setLoading(true);
      try {
        const data = await listConnections(agentId);
        if (ignore) return;
        setRows(data);
        initialRef.current = data;
        onChange?.(data);
      } catch (e) {
        console.error(e);
        setNotifMessage({ title: "Error", description: "Failed to load connections", variant: "error" });
        setShowNotif(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // ---------- UI actions (unchanged visuals, cleaned logic) ----------
  function openCatalog() {
    setCatalogOpen(true);
  }

  function closeCatalog() {
    setCatalogOpen(false);
  }

  function addProvider(p: ProviderMeta) {
    // Create a row immediately for a snappy UI; extId defaults to provider extId
    const newRow: ConnectionItem = {
      id: makeTempId(p.id),
      agentId,
      providerId: p.id,
      extId: p.extId,
      status: "needs_setup",
      config: null,
      token: null,
    };
    const next = [...rows, newRow];
    // Persist
    applyDelta(initialRef.current, next);
    closeCatalog();
  }

  function removeRow(rowId: number | string) {
    const next = rows.filter((r) => r.id !== rowId);
    applyDelta(initialRef.current, next);
  }

  async function startAuth(p: ProviderMeta, rowId: number | string) {
    try {
      if (!p.startAuth) {
        // no auth needed
        return;
      }
      const res = await p.startAuth();
      const token = res?.token ?? null;
      const next = rows.map((r) => (r.id === rowId ? { ...r, token, status: token ? "connected" : r.status } : r));
      applyDelta(initialRef.current, next);
    } catch (e) {
      console.error(e);
      setNotifMessage({ title: "Error", description: "Authentication failed", variant: "error" });
      setShowNotif(true);
    }
  }

  function openConfig(p: ProviderMeta, rowId: number | string) {
    setConfigTarget({ provider: p, id: String(rowId) });
    setConfigOpen(true);
  }

  function closeConfig() {
    setConfigOpen(false);
    setConfigTarget(null);
    startAuth(configTarget?.provider!, configTarget?.id!);
  }

  function saveConfig(values: Record<string, string>) {
    if (!configTarget) return;
    const next = rows.map((r) => (String(r.id) === configTarget.id ? { ...r, config: values } : r));
    // Persist and close
    applyDelta(initialRef.current, next);
    closeConfig();
  }

  // ---------- render (unchanged visuals / structure) ----------
  return (
    <div className="space-y-4">
      {/* Title */}
      <section className="flex flex-col gap-4">

        {/* Step title */}
        <h3 className="text-xl font-extrabold leading-tight">
          Step 6: Connections
        </h3>

        {/* Banner image */}
        <img
          src={"/assets/agent/banners/step-6.png"}
          alt="Give your Future Human a special style"
          className="block w-full rounded-3xl mt-0 mb-5"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      </section>

      {/* Grid of tiles (structure preserved) */}
      <div className="grid grid-cols-3 gap-3">
        {/* Add tile */}
        <AddTile onClick={openCatalog} />

        {/* Existing connections */}
        {rows.map((c) => {
          const provider = catalogById[c.providerId];
          if (!provider) return null;
          return (
            <ConnectionTile
              key={String(c.id)}
              provider={provider}
              connection={c}
              onRemove={() => removeRow(c.id!)}
              onConfigure={() => openConfig(provider, c.id!)}
            />
          );
        })}
      </div>

      {/* Catalog Modal (unchanged visuals) */}
      <CatalogModal
        open={catalogOpen}
        onClose={closeCatalog}
        onPick={(p) => addProvider(p)}
      />

      {/* Config Modal (unchanged visuals) */}
      <ConfigModal
        open={configOpen}
        onClose={closeConfig}
        provider={configTarget ? catalogById[configTarget.provider.id] : null}
        values={
          configTarget
            ? (rows.find((r) => String(r.id) === configTarget.id)?.config as Record<string, string>) ?? {}
            : {}
        }
        onSave={saveConfig}
      />
    </div>
  );
}
