import * as React from "react";
import { Crown, Pipette } from "lucide-react";
import type { AgentAppearance } from "../../../services/agents";

type Props = {
  value: AgentAppearance;
  onChange: (next: AgentAppearance) => void;
  className?: string;
};

const ACCENT = "#E7E31B";
const DEFAULT_COLORS = [
  "#111111",
  "#1f2937",
  "#0ea5e9",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#f97316",
];

// Static 9 personas: p1..p9 (ids only; PersonaCard can render however it likes)
const STATIC_PERSONAS = Array.from({ length: 8 }).map((_, i) => ({ personaId: `p${i + 1}` }));

function isLightHex(hex?: string | null) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; // perceived luminance
  return L > 160;
}

function openAvatarStudio() {
  // Logic to open the avatar studio
}

function PersonaCard({
  persona,
  active,
  onClick,
  locked = false
}: {
  persona: string;
  active: boolean;
  onClick: () => void;
  locked?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full aspect-square rounded-2xl overflow-hidden border transition-shadow ${active ? "border-transparent" : "border-[#222]"
        }`}
      style={{ boxShadow: active ? `0 0 0 3px ${ACCENT}` : undefined }}
      aria-pressed={active}
      aria-label={persona as string}
    >
      {/*
      <img
        alt={persona || "Persona"}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
      />
      */}

      {locked && (
        <div
          className="absolute right-2 top-2 w-6 h-6 rounded-full grid place-items-center"
          style={{ backgroundColor: ACCENT }}
          aria-label="Locked"
        >
          <Crown className="w-4 h-4 text-black" />
        </div>
      )}

      {persona === "studio" && (
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

export default function PersonaForm({ value, onChange, className = "" }: Props) {
  // Local mirrors for UI control
  const [bgColor, setBgColor] = React.useState<string>(value?.bgColor ?? "#111111");
  const [items, setItems] = React.useState<any[]>([]);
  const [loading] = React.useState<boolean>(false); // no async load; static list
  const [selected, setSelected] = React.useState<any | null>(null);
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize static personas once
  React.useEffect(() => {
    setItems(STATIC_PERSONAS);
  }, []);

  // Sync bg from parent
  React.useEffect(() => {
    if (value?.bgColor && value.bgColor !== bgColor) setBgColor(value.bgColor);
  }, [value?.bgColor]);

  // Sync selected from parent personaId
  React.useEffect(() => {
    if (!value?.personaId) {
      setSelected(null);
      return;
    }
    const match = STATIC_PERSONAS.find((p) => String(p.personaId) === String(value.personaId));
    setSelected(match ?? null);
  }, [value?.personaId]);

  // Wiring only: set AgentAppearance fields
  function setColor(c: string) {
    setBgColor(c);
    onChange({ ...value, bgColor: c || null });
  }

  function pick(p: any) {
    setSelected(p);
    const id = p?.personaId != null ? String(p.personaId) : "";
    onChange({ ...value, personaId: id || null });
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
          src={"/assets/agent/banners/step-2.png"}
          alt="Give your Future Human a special style"
          className="block w-full rounded-3xl mt-0 mb-5"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      </section>

      {/* Grid label */}
      <div className="text-sm text-gray-300 mb-2">Avatar</div>

      {/* Grid of personas */}
      <div className="grid grid-cols-3 gap-4">
        <PersonaCard
          key={"create"}
          persona={"create"}
          active={false}
          onClick={() => openAvatarStudio()}
          locked={true}
        />
        {(items ?? []).map((p) => (
          <PersonaCard
            key={p.personaId}
            persona={p}
            active={String(value.personaId) === String(p.personaId)}
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
              value={bgColor as string}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer rounded-full bg-[#111] appearance-none"
              title="Pick a color"
            />
          </div>



          {/* hidden color input */}
          <input
            ref={colorInputRef}
            type="color"
            value={bgColor as string}
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
