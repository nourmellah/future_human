import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Image as Lock, Crown, X } from "lucide-react";
import DropZone from "../../Form/DropZone";

const ACCENT = "#E7E31B";

/* ------------------------ Types ------------------------ */
export type BackgroundCard = {
  id: string;
  name: string;
  thumbnail: string;     // landscape thumbnail
  payload?: any;         // whatever your character app needs (scene id, env config, etc.)
  locked?: boolean;      // for future premium items
  badge?: "crown" | "lock";
};

export type BackgroundCardsFormProps = {
  bannerSrc?: string;
  /** If provided, used immediately; otherwise we call fetchBackgrounds() */
  initial?: BackgroundCard[];
  /** Load backgrounds from server (replace with your API) */
  fetchBackgrounds?: () => Promise<BackgroundCard[]>;
  /** Bubble up selection so the parent can call the character app */
  onRequestApply?: (bg: BackgroundCard) => void;
  /** Notify parent if user adds/removes items locally */
  onChange?: (cards: BackgroundCard[]) => void;
};

/* ------------------------ Stubs ------------------------ */
async function fetchBackgroundsStub(): Promise<BackgroundCard[]> {
  // Replace with your API (e.g., GET /api/backgrounds)
  return [
    { id: "dubai", name: "Dubai", thumbnail: "/assets/bg/dubai.jpg" },
    { id: "bali", name: "Bali", thumbnail: "/assets/bg/bali.jpg" },
    { id: "greece", name: "Greece", thumbnail: "/assets/bg/greece.jpg" },
    { id: "djerba", name: "Djerba", thumbnail: "/assets/bg/djerba.jpg" },
    { id: "phil", name: "Philippines", thumbnail: "/assets/bg/philippines.jpg" },
    { id: "italy", name: "Italy", thumbnail: "/assets/bg/italy.jpg" },
    { id: "paris", name: "Paris", thumbnail: "/assets/bg/paris.jpg" },
    { id: "la", name: "Los Angeles", thumbnail: "/assets/bg/la.jpg" },
  ];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ------------------------ Modal ------------------------ */
function Modal({
  open,
  onClose,
  children,
  widthClass = "max-w-md",
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
        <div className={`w-full ${widthClass} rounded-2xl bg-[#0b0b0b] border border-[#222] p-5`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ------------------------ Add Background Modal ------------------------ */
function AddBackgroundModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (bg: BackgroundCard) => void;
}) {
  const [name, setName] = useState("");
  const [thumb, setThumb] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function clearLocal(opts: { revoke?: boolean } = {}) {
    const { revoke = false } = opts;
    if (revoke && thumb && thumb.startsWith("blob:")) {
      try { URL.revokeObjectURL(thumb); } catch {}
    }
    setName("");
    setThumb("");
    setFile(null);
  }

  // close wrapper used by overlay or Cancel
  function handleClose() {
    clearLocal({ revoke: true });  // cancel -> safe to revoke
    onClose();
  }

  // also clear if parent programmatically closes the modal
  useEffect(() => {
    if (!open) {
      clearLocal({ revoke: true });
    }
  }, [open]);

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="text-white font-extrabold text-lg mb-3">Add Background</div>

      <label className="block mb-3">
        <span className="block text-xs text-gray-300 mb-1">Name</span>
        <input
          className="w-full rounded-xl bg-[#111] text-white border border-[#222] px-3 py-2 outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Santorini"
        />
      </label>

      {/* Image upload (click or drag & drop) */}
      <div className="mb-1 text-xs text-gray-300">Image</div>
      <DropZone value={thumb} onChange={setThumb} onFile={setFile} />

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={handleClose} className="px-4 py-2 rounded-full border border-[#333] text-white">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!name.trim() || (!thumb && !file)) return;
            // use existing preview from DropZone or create one from File
            const preview = thumb || (file ? URL.createObjectURL(file) : "");
            onCreate({
              id: uid(),
              name: name.trim(),
              thumbnail: preview,                         // grid <img src> uses this
              payload: file ? { fileName: file.name, fileType: file.type } : undefined,
            });
            // DO NOT revoke here; the card needs the object URL
            clearLocal({ revoke: false });
            onClose();
          }}
          className="px-4 py-2 rounded-full font-extrabold"
          style={{ backgroundColor: ACCENT, color: "#000" }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------ Tiles ------------------------ */
function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-[#222] bg-[#0b0b0b] hover:bg-[#111]
                 aspect-[4/3] grid place-items-center overflow-hidden"
    >
      <div className="flex flex-col items-center gap-2 text-white">
        <div className="grid place-items-center w-10 h-10 rounded-full bg-black/40">
          <Plus className="w-5 h-5" />
        </div>
        <div className="font-extrabold leading-tight text-center">
          <div>ADD</div>
          <div>CARDS</div>
        </div>
      </div>
    </button>
  );
}

function CardTile({
  item,
  active,
  onSelect,
  onRemove
}: {
  item: BackgroundCard;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const badge = item.locked || item.badge ? (
    <div className="absolute left-2 top-2 w-6 h-6 rounded-full grid place-items-center" style={{ backgroundColor: ACCENT }}>
      {item.badge === "crown" ? <Crown className="w-4 h-4 text-black" /> : <Lock className="w-4 h-4 text-black" />}
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        className={`relative rounded-2xl border overflow-hidden aspect-[4/3] text-left
                  ${active ? "border-transparent" : "border-[#232323]"} bg-[#0b0b0b]`}
        style={{ boxShadow: active ? `0 0 0 3px ${ACCENT}` : undefined }}
        title={item.name}
      >
        {badge}
        <img
          src={item.thumbnail}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
        {/* Label bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5">
          <div className="text-[11px] text-white truncate">{item.name}</div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white"
          title="Remove"
        >
          <X className="w-4 h-4" />
        </button>
      </button>
    </>
  );
}

/* ------------------------ Main Form ------------------------ */
export default function BackgroundCardsForm({
  initial,
  fetchBackgrounds = fetchBackgroundsStub,
  onRequestApply,
  onChange,
}: BackgroundCardsFormProps) {
  const [items, setItems] = useState<BackgroundCard[] | null>(initial ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (items) return;
      const data = await fetchBackgrounds();
      if (!cancelled) setItems(data);
    }
    load();
    return () => { cancelled = true; };
  }, [items, fetchBackgrounds]);

  useEffect(() => { if (items) onChange?.(items); }, [items, onChange]);

  const selected = useMemo(
    () => items?.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );
  void selected;

  function select(bg: BackgroundCard) {
    setSelectedId(bg.id);
    // 🔌 Hook point: ask the parent/character app to apply this background
    onRequestApply?.(bg);
  }

  return (
    <div className="text-white">
      {/* Header */}
      <section className="flex flex-col gap-4">

        {/* Step title */}
        <h3 className="text-xl font-extrabold leading-tight">
          Step 5: Background
        </h3>

        {/* Banner image */}
        <img
          src={"/assets/agent/banners/step-2.png"}
          alt="Give your Future Human a special style"
          className="block w-full rounded-3xl mt-0 mb-5"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      </section>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        <AddTile onClick={() => setAdding(true)} />
        {(items ?? []).map((bg) => (
          <CardTile
            key={bg.id}
            item={bg}
            active={selectedId === bg.id}
            onSelect={() => select(bg)}
            onRemove={() => {
              setItems((prev) => prev ? prev.filter((i) => i.id !== bg.id) : prev);
              setSelectedId((prev) => (prev === bg.id ? null : prev));
            }}

          />
        ))}

        {/* Loading skeletons when fetching for first time */}
        {!items && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] rounded-2xl bg-[#0b0b0b] border border-[#222] animate-pulse" />
        ))}
      </div>

      {/* Add background modal */}
      <AddBackgroundModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={(bg) => setItems((prev) => (prev ? [bg, ...prev] : [bg]))}
      />
    </div>
  );
}
