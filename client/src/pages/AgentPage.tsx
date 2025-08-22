// src/pages/CreateAgentPage.tsx
import ThreePaneLayout from "../layouts/ThreePaneLayout";         // adjust path if needed
import SidebarNav from "../components/SidebarNav";                 // left app sidebar
import IdentityForm from "../components/Agent/Forms/IdentityForm"; // form component
import { AgentWizardProvider, useAgentWizard, type ConnectionsData, type IdentityData, type WizardState } from "../state/agentWizard";
import CenterStage from "../components/Agent/CenterStage";
import PersonaForm from "../components/Agent/Forms/PersonaForm";
import VoiceSoulForm from "../components/Agent/Forms/VoiceSoulForm";
import BrainForm from "../components/Agent/Forms/BrainForm";
import ConnectionsForm from "../components/Agent/Forms/ConnectionsForm";
import BackgroundCardsForm from "../components/Agent/Forms/BackgroundCardsForm";
import * as React from "react";

// Icons
import {
  Zap,
  IdCard,
  UserRound,
  AudioLines,
  Layers,
  List,
  Eye,
  Brain,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { getAgent, listConnections } from "../services/agents";
import type { Agent } from "../AgentsProvider";
const ACCENT = "#E7E31B";
const DONE = "#22c55e";

/* ---------------------------
 * Right panel — Steps
 * --------------------------- */
const STEPS = [
  { key: "identity", label: "Identity", Icon: IdCard },
  { key: "appearance", label: "Appearance", Icon: UserRound },
  { key: "voiceSoul", label: "Voice and Soul", Icon: AudioLines },
  { key: "brain", label: "Brain", Icon: Brain },
  { key: "cards", label: "Background", Icon: Layers },
  { key: "connections", label: "Connections", Icon: Zap },
  /* Heart  Lightbulb */
] as const;
type StepKey = typeof STEPS[number]["key"];

function StepFooter({
  onBack,
  onNext,
  nextLabel = "Save & Next",
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-6 flex gap-3">
      <button
        onClick={onBack}
        className="px-5 py-2 rounded-full border border-[#333] text-white"
      >
        Back
      </button>
      <button
        onClick={onNext}
        className="px-5 py-2 rounded-full font-extrabold"
        style={{ backgroundColor: "#E7E31B", color: "#000" }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function RightPanel() {
  const { state, save, next, back, saveDraft, submit, goto } = useAgentWizard();
  const [agent, setAgent] = React.useState<WizardState | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const active: StepKey = state.current as StepKey;
  const activeIndex = STEPS.findIndex((s) => s.key === active);

  const { id } = useParams<{ id?: string }>();
  if (id) {
  getAgent(id).then(async (data) => {
    const a = data.agent;

    const agentId = String(a.id);
    const current = "identity";

    const identity = {
      name: a.identity?.name ?? "",
      role: a.identity?.role ?? "",
      description: a.identity?.desc ?? "",
    };

    const appearance = {
      personaId: a.appearance?.personaId ?? null,
      bgColor: a.appearance?.bgColor ?? "#2a2a2a",
    };

    const voiceSoul = {
      language: a.voice?.language ?? "",
      voice: a.voice?.name ?? "",
      styleFormality: a.style?.formality ?? 0,
      stylePace: a.style?.pace ?? 0,
      tempCalm: a.style?.calm ?? 0,
      tempIntrovert: a.style?.introvert ?? 0,
      empathy: a.style?.empathy ?? 0,
      humor: a.style?.humor ?? 0,
      creativity: a.style?.creativity ?? 0,
      directness: a.style?.directness ?? 0,
    };

    const brain = {
      id: a.brain?.id ?? "",
      instructions: a.brain?.instructions ?? "",
    };

    const cards = {
      backgroundId: a.cards?.backgroundId ?? null,
    };

    const fetchedConnections = await listConnections(agentId);
    const connections: ConnectionsData = {
      // normalize the result: listConnections might return an array or an object like { connections: [] }
      items: Array.isArray(fetchedConnections)
        ? fetchedConnections
        : (fetchedConnections.connections ?? []),
    };

    const draftId = a.draftId ?? undefined;

    setAgent({
      agentId,
      current,
      identity,
      appearance,
      voiceSoul,
      brain,
      cards,
      connections,
      draftId,
      updatedAt: Date.now(),
    });
  });
}



  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">
            {state.identity.name || "SMART AGENT"}
          </h1>
          <p className="text-gray-400">{state.identity.role || "ANSWE"}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="grid place-items-center w-10 h-10 rounded-full bg-[#1c1c1c]">
            <List className="w-5 h-5" />
          </button>
          <button className="grid place-items-center w-10 h-10 rounded-full bg-[#1c1c1c]">
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-[#1e1e1e] my-5" />

      {/* Step buttons */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {STEPS.map(({ key, Icon }, idx) => {
          const isCurrent = key === active;
          const isPast = idx < activeIndex;
          const bg = isCurrent ? ACCENT : isPast ? DONE : "#fff";
          const color = "#000";
          return (
            <button
              key={key}
              type="button"
              onClick={() => { if (state.current !== key) goto(key as any); }}
              title={key}
              className="grid place-items-center w-11 h-11 rounded-full border border-[#222]"
              style={{ backgroundColor: bg, color }}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Routed body */}
      {state.current === "identity" && (
        <>
          <IdentityForm
            initial={state.identity}                         // IdentityForm expects values/onChange(patch)
            onChange={(patch) => save("identity", patch)}
          />
          <StepFooter onBack={back} onNext={() => { saveDraft(); next(); }} />
        </>
      )}

      {state.current === "appearance" && (
        <>
          {/* PersonaForm in your repo expects selectedId/onSelect(persona) */}
          <PersonaForm
            selectedId={state.appearance.personaId ?? undefined}
            onSelect={(p) => save("appearance", { personaId: p, bgColor: state.appearance.bgColor })}
          />
          <StepFooter onBack={back} onNext={() => { saveDraft(); next(); }} />
        </>
      )}

      {state.current === "voiceSoul" && (
        <>
          <VoiceSoulForm
            initial={state.voiceSoul}
            onChange={(d) => save("voiceSoul", d)}
          />
          <StepFooter onBack={back} onNext={() => { saveDraft(); next(); }} />
        </>
      )}

      {state.current === "brain" && (
        <>
          <BrainForm
            initial={state.brain}
            onChange={(d) => save("brain", d)}
          />
          <StepFooter onBack={back} onNext={() => { saveDraft(); next(); }} />
        </>
      )}

      {state.current === "cards" && (
        <>
          <BackgroundCardsForm
            onRequestApply={(bg) => save("cards", { backgroundId: bg.id })}
            onChange={(cards) => {
              const exists = cards.find((c) => c.id === state.cards.backgroundId);
              if (!exists && cards.length) {
                save("cards", { backgroundId: cards[0].id });
              }
            }}
          />
          <StepFooter onBack={back} onNext={() => { saveDraft(); next(); }} />
        </>
      )}

      {state.current === "connections" && (
        <>
          <ConnectionsForm
            initial={state.connections.items}
            onChange={(items) => save("connections", { items })}
          />
          <StepFooter onBack={back} onNext={submit} nextLabel="Create Agent" />
        </>
      )}
    </div>
  );
}


/* ---------------------------
 * Page
 * --------------------------- */
export default function AgentPage() {
  // Example agents for the left app sidebar
  const agents = [
    { id: "1", name: "FDS", role: "FGDF", thumbnail: "/assets/avatars/1.jpg" },
    { id: "2", name: "Nour", role: "Sales Agent", thumbnail: "/assets/avatars/2.jpg" },
  ];

  return (
    <AgentWizardProvider>
      <ThreePaneLayout
        sidebar={<SidebarNav agents={agents} />}
        center={<CenterStage />}
        right={<div className="h-full pr-7 lg:pr-8"><RightPanel /></div>}
        rightWidth={520}
      />
    </AgentWizardProvider>
  );
}

