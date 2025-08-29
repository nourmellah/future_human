import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import type { IconSelectOption } from "../../Form/IconSelect";
import DualBalanceSlider from "../../Form/DualBalanceSlider";
import IconSelect from "../../Form/IconSelect";
import ReactCountryFlag from "react-country-flag";
import type { AgentStyle, AgentVoice } from "../../../services/agents";

const ACCENT = "#E7E31B";

export type VoiceSoulState = {
  voice: AgentVoice;
  style: AgentStyle;
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

const toInt010 = (v: any, fallback = 5) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  const r = Math.round(n);
  return Math.max(0, Math.min(10, r));
};

export default function VoiceSoulForm({
  bannerSrc = "/assets/create/voice-banner.png",
  languageOptions = DEFAULT_LANGS,
  voiceOptions = DEFAULT_VOICES,
  initial,
  onChange,
}: VoiceSoulFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [state, setState] = useState<VoiceSoulState>({
    voice: {
      language: initial?.voice?.language || "en-US",
      name:     initial?.voice?.name    || "alloy",
    },

    style: {
      formality:  toInt010(initial?.style?.formality),
      pace:       toInt010(initial?.style?.pace),
      calm:       toInt010(initial?.style?.calm),
      introvert:  toInt010(initial?.style?.introvert),
      empathy:    toInt010(initial?.style?.empathy ?? 5),
      humor:      toInt010(initial?.style?.humor ?? 5),
      creativity: toInt010(initial?.style?.creativity ?? 5),
      directness: toInt010(initial?.style?.directness ?? 5),
    }});

  function patch(p: Partial<VoiceSoulState>) {
    setState((s) => {
      const next = { ...s, ...p } as VoiceSoulState;
      onChange?.(next);
      return next;
    });
  }

  const derived = useMemo(
    () => ({
      styleRelaxed: 10 - state.style.formality,
      styleLongReply: 10 - state.style.pace,
      tempImpulsive: 10 - state.style.calm,
      tempExtrovert: 10 - state.style.introvert,
      persLiteral: 10 - state.style.empathy,
      persSerious: 10 - state.style.humor,
      persFactual: 10 - state.style.creativity,
      persIndirectedness: 10 - state.style.directness,
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
        value={state.voice.language}
        onChange={(v) => patch({ voice: { ...state.voice, language: v } })}
        options={languageOptions}
        placeholder="Select language"
        className="mb-4"
      />

      {/* Voice */}
      <IconSelect
        label="Select Voice"
        value={state.voice.name}
        onChange={(v) => patch({ voice: { ...state.voice, name: v } })}
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
          value={state.style.formality}
          onChange={(left) => patch({ style: { ...state.style, formality: left } })}
          className="mb-4"
        />
        <DualBalanceSlider
          leftLabel="Fast"
          rightLabel="Long Reply"
          value={state.style.pace}
          onChange={(left) => patch({ style: { ...state.style, pace: left } })}
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
              value={state.style.calm}
              onChange={(left) => patch({ style: { ...state.style, calm: left } })}
              className="mb-4"
            />
            <DualBalanceSlider
              leftLabel="Introvert"
              rightLabel="Extrovert"
              value={state.style.introvert}
              onChange={(left) => patch({ style: { ...state.style, introvert: left } })}
            />
          </div>

          <div>
            <div className="text-base font-extrabold mb-3 mt-10">Personality</div>
            <DualBalanceSlider
              leftLabel="Literal"
              rightLabel="Empathetic"
              value={state.style.empathy}
              onChange={(left) => patch({ style: { ...state.style, empathy: left } })}
              className="mb-4"
            />
            <DualBalanceSlider
              leftLabel="Serious"
              rightLabel="Playful"
              value={state.style.humor}
              onChange={(left) => patch({ style: { ...state.style, humor: left } })}
              className="mb-4"
            />
            <DualBalanceSlider
              leftLabel="Factual"
              rightLabel="Imaginative"
              value={state.style.creativity}
              onChange={(left) => patch({ style: { ...state.style, creativity: left } })}
              className="mb-4"
            />
            <DualBalanceSlider
              leftLabel="Indirect"
              rightLabel="Direct"
              value={state.style.directness}
              onChange={(left) => patch({ style: { ...state.style, directness: left } })}
            />
          </div>
        </div>
      )}

    </div>
  );
}
