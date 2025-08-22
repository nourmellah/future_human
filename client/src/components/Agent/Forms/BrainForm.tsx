import { useMemo, useState } from "react";
import { Crown, Lock } from "lucide-react";

const ACCENT = "#E7E31B";

export type BrainTier = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  locked?: boolean; // paid/locked tier
  badge?: "crown" | "lock"; // visual badge in the corner
};

export type BrainState = {
  brainId: string; // selected tier id
  instructions: string;
};

export type BrainFormProps = {
  tiers?: BrainTier[];
  /** Initial values */
  initial?: Partial<BrainState>;
  /** Called whenever form state changes */
  onChange?: (state: BrainState) => void;
  /** Called if a locked tier is clicked (e.g., open paywall) */
  onRequestUnlock?: (tier: BrainTier) => void;
};
const DEFAULT_TIERS: BrainTier[] = [
	{
		id: "level1",
		title: "AGENT\nLEVEL ONE",
		subtitle: "Instant, accurate single-step answers & lookups",
	},
	{
		id: "level2",
		title: "AGENT\nLEVEL 2",
		subtitle: "Smart multi-step reasoning — handles workflows & follow-ups",
	},
	{
		id: "super",
		title: "SUPER\nBRAIN",
		subtitle: "Elite long-term planning, creativity & coding — unlock advanced capabilities",
		locked: true,
		badge: "crown",
	},
];

function TierCard({
  tier,
  active,
  onSelect,
  onLocked,
}: {
  tier: BrainTier;
  active: boolean;
  onSelect: () => void;
  onLocked: () => void;
}) {
  const badge = useMemo(() => {
    if (!tier.locked && !tier.badge) return null;
    return (
      <div
        className="absolute right-2 top-2 w-6 h-6 rounded-full grid place-items-center"
        style={{ backgroundColor: ACCENT }}
      >
        {tier.badge === "crown" ? (
          <Crown className="w-4 h-4 text-black" />
        ) : (
          <Lock className="w-4 h-4 text-black" />
        )}
      </div>
    );
  }, [tier.locked, tier.badge]);

  return (
    <button
      type="button"
      onClick={tier.locked ? onLocked : onSelect}
      className={`relative w-full aspect-square rounded-2xl border p-4 transition
        ${active ? "border-transparent" : "border-[#232323]"}
        ${tier.locked ? "opacity-90" : ""}
        bg-[#0b0b0b] hover:bg-[#111]
        flex flex-col items-center justify-center text-center`}
      style={{ boxShadow: active ? `0 0 0 3px ${ACCENT}` : undefined }}
      aria-pressed={active}
      aria-label={tier.title.replace(/\n/g, " ")}
    >
      {badge}
      <div className="text-white font-extrabold leading-tight whitespace-pre-line text-sm">
        {tier.title}
      </div>
      {tier.subtitle ? (
        <div className="mt-2 text-[11px] text-gray-300 whitespace-pre-line">
          {tier.subtitle}
        </div>
      ) : null}
    </button>
  );
}

export default function BrainForm({
  tiers = DEFAULT_TIERS,
  initial,
  onChange,
  onRequestUnlock,
}: BrainFormProps) {
  const [state, setState] = useState<BrainState>({
    brainId: initial?.brainId || tiers[0]?.id || "level1",
    instructions:
      initial?.instructions ||
      "Example: A vibrant sales agent at a fast-food joint is quick-witted, energetic, and adept at handling bustling crowds, taking orders, and ensuring customers have an enjoyable dining experience.",
  });

  function patch(p: Partial<BrainState>) {
    setState((s) => {
      const next = { ...s, ...p } as BrainState;
      onChange?.(next);
      return next;
    });
  }

  const selected = useMemo(() => state.brainId, [state.brainId]);

  return (
    <div className="text-white">
      {/* Title */}
      <section className="flex flex-col gap-4">

        {/* Step title */}
        <h3 className="text-xl font-extrabold leading-tight">
          Step 4: Brain
        </h3>

        {/* Banner image */}
        <img
          src={"src/assets/agent/banners/step-4.png"}
          alt="Give your Future Human a special style"
          className="block w-full rounded-3xl mt-0 mb-5"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      </section>

      {/* Select Brain type */}
      <div className="text-sm text-gray-300 mb-2">Select Brain type</div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {tiers.map((t) => (
          <TierCard
            key={t.id}
            tier={t}
            active={selected === t.id}
            onSelect={() => patch({ brainId: t.id })}
            onLocked={() => onRequestUnlock?.(t)}
          />
        ))}
      </div>

      {/* Instructions */}
      <div className="text-sm font-extrabold mb-2">Instructions</div>
      <div className="rounded-2xl bg-[#0b0b0b] border border-[#222] p-4">
        <textarea
          value={state.instructions}
          onChange={(e) => patch({ instructions: e.target.value })}
          placeholder="Describe your agent's purpose, tone, and capabilities..."
          className="w-full min-h-[180px] bg-transparent text-white outline-none resize-vertical"
        />
      </div>
    </div>
  );
}
