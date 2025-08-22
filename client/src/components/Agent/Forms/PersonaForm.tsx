import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Pipette } from "lucide-react";
import type { AppearanceData } from "../../../state/agentWizard";

const DEFAULT_COLORS = ["#0b0b0b", "#111111", "#232327", "#334155", "#94a3b8", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

/* ----------------------------- Types ----------------------------- */

export type Persona = {
  id: string;
  name?: string;
  thumbnail: string;   // URL
  locked?: boolean;    // show crown when true
};

export type PersonaFormProps = {
  /** NEW preferred persistence API */
  initial?: AppearanceData;                          // { personaId }
  onChange?: (patch: Partial<AppearanceData>) => void;

  /** LEGACY compatibility (still supported) */
  selectedId?: string | null;
  onSelect?: (id: string) => void;

  /** Data sources */
  personas?: Persona[];                              // if you already fetched them
  fetchPersonas?: () => Promise<Persona[]>;          // called if personas not provided
  bannerSrc?: string;
  fetchBanner?: () => Promise<string>;

  /** Misc */
  className?: string;
};

/* ----------------------------- Defaults ----------------------------- */
const ACCENT = "#E7E31B";

async function fetchPersonasDefault(): Promise<Persona[]> {
  // Stub list (first tile locked)
  return [
    { id: "studio", name: "Avatar Studio", thumbnail: "/assets/personas/studio.jpg", locked: true },
    { id: "p1", name: "Aiden", thumbnail: "/assets/personas/1.jpg" },
    { id: "p2", name: "Maya", thumbnail: "/assets/personas/2.jpg" },
    { id: "p3", name: "Omar", thumbnail: "/assets/personas/3.jpg" },
    { id: "p4", name: "Liam", thumbnail: "/assets/personas/4.jpg" },
    { id: "p5", name: "Noah", thumbnail: "/assets/personas/5.jpg" },
    { id: "p6", name: "Ava", thumbnail: "/assets/personas/6.jpg" },
    { id: "p7", name: "Ella", thumbnail: "/assets/personas/7.jpg" },
    { id: "p8", name: "Zoe", thumbnail: "/assets/personas/8.jpg" },
  ];
}

/* ----------------------------- UI bits ----------------------------- */
function PersonaCard({
  persona,
  active,
  onClick,
}: {
  persona: Persona;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full aspect-square rounded-2xl overflow-hidden border transition-shadow ${active ? "border-transparent" : "border-[#222]"
        }`}
      style={{ boxShadow: active ? `0 0 0 3px ${ACCENT}` : undefined }}
      title={persona.name}
      aria-pressed={active}
      aria-label={persona.name}
    >
      <img
        src={persona.thumbnail}
        alt={persona.name || "Persona"}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
      />

      {persona.locked && (
        <div
          className="absolute right-2 top-2 w-6 h-6 rounded-full grid place-items-center"
          style={{ backgroundColor: ACCENT }}
          aria-label="Locked"
        >
          <Crown className="w-4 h-4 text-black" />
        </div>
      )}

      {persona.id === "studio" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-white text-sm sm:text-base font-extrabold tracking-wide text-center drop-shadow">
            AVATAR
            <br />
            STUDIO
          </div>
        </div>
      )}
    </button>
  );
}

/* ----------------------------- Component ----------------------------- */
export default function PersonaForm({
  initial,
  onChange,
  selectedId: selectedIdProp,
  personas,
  fetchPersonas = fetchPersonasDefault,
  className = "",
}: PersonaFormProps) {
  // Resolve initial selection from either API
  const resolvedInitialId = (initial?.personaId ?? selectedIdProp) ?? null;

  // Data sources (prefer provided props; else fetch)
  const [items, setItems] = useState<Persona[] | null>(personas ?? null);
  const [loading, setLoading] = useState(false);
  const [bgColor, setBgColor] = useState<string>(initial?.bgColor ?? "#232327");
  const colorInputRef = useRef<HTMLInputElement>(null);

  function setColor(c: string) {
    setBgColor(c);
    onChange?.({ bgColor: c });
  }

  function isLightHex(hex: string): boolean {
    try {
      const h = hex.replace("#", "");
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7;
    } catch { return false; }
  }

  // Local selection mirrors the resolved prop and stays in sync if parent changes
  const [selectedId, setSelectedId] = useState<string | null>(resolvedInitialId);
  useEffect(() => {
    setSelectedId(resolvedInitialId);
  }, [resolvedInitialId]);

  // Fetch personas/banner if not provided
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (!items) {
          const data = await fetchPersonas();
          if (!cancelled) setItems(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (!items) load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Derived selected object (if needed)
  const selected = useMemo(() => items?.find((p) => p.id === selectedId) ?? null, [items, selectedId]);

  // Pick handler: update local + bubble up through whichever API the parent uses
  function pick(p: Persona) {
    if (p.locked) return; // later: open paywall
    setSelectedId(p.id);

    // Preferred
    onChange?.({ personaId: p.id, bgColor });
  }

  return (
    <div className={`text-white ${className}`}>
      {/* Title */}
      <section className="flex flex-col gap-4">

        {/* Step title */}
        <h3 className="text-xl font-extrabold leading-tight">
          Step 2: Persona
        </h3>

        {/* Banner image */}
        <img
          src={"src/assets/agent/banners/step-2.png"}
          alt="Give your Future Human a special style"
          className="block w-full rounded-3xl mt-0 mb-5"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      </section>

      {/* Grid label */}
      <div className="text-sm text-gray-300 mb-2">Avatar</div>

      {/* Grid of personas */}
      <div className="grid grid-cols-3 gap-4">
        {(items ?? []).map((p) => (
          <PersonaCard
            key={p.id}
            persona={p}
            active={!!selected && selected.id === p.id}
            onClick={() => pick(p)}
          />
        ))}

        {/* Loading skeletons (first load) */}
        {loading && (!items || items.length === 0) && (
          <>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-[#0b0b0b] border border-[#222] animate-pulse" />
            ))}
          </>
        )}
      </div>

      {/* Background color selector */}
      <div className="mt-4">
        <div className="text-sm text-gray-300 mb-2">Background</div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom color picker swatch (first) */}
          <div className="relative w-8 h-8">
            <div
              className={`grid place-items-center w-8 h-8 rounded-full border ${DEFAULT_COLORS.includes((bgColor || "").toLowerCase())
                  ? "border-[#333]"
                  : "ring-2 ring-[var(--accent)] border-transparent"
                }`}
              style={{ backgroundColor: bgColor, ["--accent" as any]: ACCENT }}
              title="Pick a color"
            >
              <Pipette
                className="w-4 h-4"
                style={{ color: isLightHex(bgColor) ? "#000" : "#fff" }}
              />
            </div>
            {/* input stays on top */}
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer rounded-full bg-[#111] appearance-none"
              title="Pick a color"
            />
          </div>



          {/* hidden color input */}
          <input
            ref={colorInputRef}
            type="color"
            value={bgColor}
            onChange={(e) => setColor(e.target.value)}
            className="hidden"
          />

          {/* Preset swatches */}
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border ${bgColor === c ? "ring-2 ring-[var(--accent)] border-transparent" : "border-[#333]"
                }`}
              style={{ backgroundColor: c, ["--accent" as any]: ACCENT }}
              title={c}
            />
          ))}
        </div>
      </div>


    </div>
  );
}
