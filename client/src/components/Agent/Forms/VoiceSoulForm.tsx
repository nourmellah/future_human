import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import type { IconSelectOption } from "../../Form/IconSelect";
import DualBalanceSlider from "../../Form/DualBalanceSlider";
import IconSelect from "../../Form/IconSelect";
import ReactCountryFlag from "react-country-flag";

const ACCENT = "#E7E31B";

export type VoiceSoulState = {
  language: string;
  voice: string;

  // Primary (always visible)
  styleFormality: number; // Formal ↔ Relaxed
  stylePace: number;      // Fast ↔ Long Reply

  // Advanced (behind toggle)
  tempCalm: number;         // Calm ↔ Impulsive
  tempIntrovert: number;    // Introvert ↔ Extrovert
  persEmpathy: number;          // Literal ↔ Empathetic
  persHumor: number;            // Serious ↔ Playful
  persCreativity: number;       // Factual ↔ Imaginative
  persDirectness: number;       // Indirect ↔ Direct
};


export type VoiceSoulFormProps = {
  bannerSrc?: string;
  languageOptions?: IconSelectOption[];
  voiceOptions?: IconSelectOption[];
  initial?: Partial<VoiceSoulState>;
  onChange?: (state: VoiceSoulState) => void;
};

const DEFAULT_LANGS: IconSelectOption[] = [
  { value: "en", label: "English", icon: <ReactCountryFlag countryCode="US" svg /> },
  { value: "fr", label: "Français", icon: <ReactCountryFlag countryCode="FR" svg /> },
  { value: "es", label: "Español", icon: <ReactCountryFlag countryCode="ES" svg /> },
];

const DEFAULT_VOICES: IconSelectOption[] = [
  { value: "alex", label: "Alex Jonson", icon: <Play className="w-4 h-4" /> },
  { value: "sara", label: "Sara", icon: <Play className="w-4 h-4" /> },
  { value: "mike", label: "Mike", icon: <Play className="w-4 h-4" /> },
];

export default function VoiceSoulForm({
  bannerSrc = "/assets/create/voice-banner.png",
  languageOptions = DEFAULT_LANGS,
  voiceOptions = DEFAULT_VOICES,
  initial,
  onChange,
}: VoiceSoulFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [state, setState] = useState<VoiceSoulState>({
    language: initial?.language || "en",
    voice: initial?.voice || "alex",
    styleFormality: initial?.styleFormality ?? 5,
    stylePace: initial?.stylePace ?? 5,
    tempCalm: initial?.tempCalm ?? 5,
    tempIntrovert: initial?.tempIntrovert ?? 5,
    persEmpathy: initial?.persEmpathy ?? 5,
    persHumor: initial?.persHumor ?? 5,
    persCreativity: initial?.persCreativity ?? 5,
    persDirectness: initial?.persDirectness ?? 5,
  });


  function patch(p: Partial<VoiceSoulState>) {
    setState((s) => {
      const next = { ...s, ...p } as VoiceSoulState;
      onChange?.(next);
      return next;
    });
  }

  const derived = useMemo(
    () => ({
      styleRelaxed: 10 - state.styleFormality,
      styleLongReply: 10 - state.stylePace,
      tempImpulsive: 10 - state.tempCalm,
      tempExtrovert: 10 - state.tempIntrovert,
      persLiteral: 10 - state.persEmpathy,
      persSerious: 10 - state.persHumor,
      persFactual: 10 - state.persCreativity,
      persIndirectedness: 10 - state.persDirectness,
    }),
    [state]
  );
  void derived;
  
  return (
    <div className="text-white">
      {/* Title  */}
      <section className="flex flex-col gap-4">

        {/* Step title */}
        <h3 className="text-xl font-extrabold leading-tight">
          Step 3: Voice and Soul
        </h3>

        {/* Banner image */}
        <img
          src={"src/assets/agent/banners/step-3.png"}
          alt="Give your Future Human a special style"
          className="block w-full rounded-3xl mt-0 mb-5"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      </section>

      {/* Banner */}
      <img
        src={bannerSrc}
        alt="Give your Future Human a soul and a voice"
        className="block w-full rounded-3xl mb-5"
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
      />

      {/* Language */}
      <IconSelect
        label="Native Language"
        value={state.language}
        onChange={(v) => patch({ language: v })}
        options={languageOptions}
        placeholder="Select language"
        className="mb-4"
      />

      {/* Voice */}
      <IconSelect
        label="Select Voice"
        value={state.voice}
        onChange={(v) => patch({ voice: v })}
        options={voiceOptions}
        placeholder="Choose a voice"
        className="mb-6"
        constantIcon={<Play className="w-4 h-4" />}
      />

      {/* Communication Style */}
      <div className="mb-6">
        <div className="text-base font-extrabold mb-3">Communication Style</div>
        <DualBalanceSlider
          leftLabel="Formal"
          rightLabel="Relaxed"
          value={state.styleFormality}
          onChange={(left) => patch({ styleFormality: left })}
          className="mb-4"
        />
        <DualBalanceSlider
          leftLabel="Fast"
          rightLabel="Long Reply"
          value={state.stylePace}
          onChange={(left) => patch({ stylePace: left })}
        />
      </div>

      {/* ===== Advanced Soul toggle ===== */}
      <div className="mb-3 flex items-center">
        <button
          type="button"
          aria-pressed={advancedOpen}
          onClick={() => setAdvancedOpen((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition
        ${advancedOpen ? "" : "bg-[#1a1a1a]"}
          `}
          style={{ backgroundColor: advancedOpen ? ACCENT : undefined }}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-black transition ${advancedOpen ? "translate-x-5" : "translate-x-1"
              }`}
          />
        </button>
        <div className="ml-3 text-base font-extrabold">Advanced Soul</div>
      </div>

      {/* ===== Advanced controls (collapsible) ===== */}
      {advancedOpen && (
        <div>
          <div>
            <div className="text-base font-extrabold mb-3 mt-10">Temperature</div>
            <DualBalanceSlider
              leftLabel="Calm"
              rightLabel="Impulsive"
              value={state.tempCalm}
              onChange={(left) => patch({ tempCalm: left })}
              className="mb-4"
            />
            <DualBalanceSlider
              leftLabel="Introvert"
              rightLabel="Extrovert"
              value={state.tempIntrovert}
              onChange={(left) => patch({ tempIntrovert: left })}
            />
          </div>

          <div>
            <div className="text-base font-extrabold mb-3 mt-10">Personality</div>
            <DualBalanceSlider
              leftLabel="Literal"
              rightLabel="Empathetic"
              value={state.persEmpathy}
              onChange={(left) => patch({ persEmpathy: left })}
              className="mb-4"
            />
            <DualBalanceSlider
              leftLabel="Serious"
              rightLabel="Playful"
              value={state.persHumor}
              onChange={(left) => patch({ persHumor: left })}
              className="mb-4"
            />
            <DualBalanceSlider
              leftLabel="Factual"
              rightLabel="Imaginative"
              value={state.persCreativity}
              onChange={(left) => patch({ persCreativity: left })}
              className="mb-4"
            />
            <DualBalanceSlider
              leftLabel="Indirect"
              rightLabel="Direct"
              value={state.persDirectness}
              onChange={(left) => patch({ persDirectness: left })}
            />
          </div>
        </div>
      )}

    </div>
  );
}
