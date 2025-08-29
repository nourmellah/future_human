import * as React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ThreePaneLayout from "../layouts/ThreePaneLayout";
import SidebarNav from "../components/SidebarNav";
import CenterStage from "../components/Agent/CenterStage";

import IdentityForm from "../components/Agent/Forms/IdentityForm";
import PersonaForm from "../components/Agent/Forms/PersonaForm";
import VoiceSoulForm from "../components/Agent/Forms/VoiceSoulForm";
import BrainForm from "../components/Agent/Forms/BrainForm";
import BackgroundCardsForm from "../components/Agent/Forms/BackgroundCardsForm";
import ConnectionsForm from "../components/Agent/Forms/ConnectionsForm";

import {
  getAgent,
  createAgent,
  patchAgent,
  listConnections,
  deleteAgent,
  saveConnectionsDelta,
  type ConnectionItem,
} from "../services/agents";
import { Zap, IdCard, UserRound, AudioLines, Layers, Brain, List, Eye, Trash2 } from "lucide-react";
import InlineNotification from "../components/Notification";

const ACCENT = "#E7E31B";
const DONE = "#22c55e";

type StepKey = "identity" | "appearance" | "voiceSoul" | "brain" | "cards" | "connections";
const STEPS: { key: StepKey; label: string; Icon: any }[] = [
  { key: "identity", label: "Identity", Icon: IdCard },
  { key: "appearance", label: "Appearance", Icon: UserRound },
  { key: "voiceSoul", label: "Voice & Soul", Icon: AudioLines },
  { key: "brain", label: "Brain", Icon: Brain },
  { key: "cards", label: "Background", Icon: Layers },
  { key: "connections", label: "Connections", Icon: Zap },
];

type Identity = { name?: string; role?: string; companyName?: string; desc?: string | null };
type Appearance = { personaId?: string | null; bgColor?: string | null };
type VoiceState = {
  language: string;
  name: string;
  style?: string | null;
};
type StyleState = {
  formality: number;   // int 0..10
  pace: number;        // int 0..10
  calm: number;        // int 0..10
  introvert: number;   // int 0..10
  empathy: number;     // int 0..10
  humor: number;       // int 0..10
  creativity: number;  // int 0..10
  directness: number;  // int 0..10
};
type BrainState = { id?: string; instructions?: string | null };
type CardsState = { backgroundId?: string | null };
type ConnectionsState = { items: ConnectionItem[] };

function serverToLocal(agent: any) {
  const identity: Identity = {
    name: agent?.identity?.name ?? "",
    role: agent?.identity?.role ?? "",
    companyName: agent?.identity?.companyName ?? "",
    desc: agent?.identity?.desc ?? null,
  };
  const appearance: Appearance = {
    personaId: agent?.appearance?.personaId ?? null,
    bgColor: agent?.appearance?.bgColor ?? null,
  };
  const voice: VoiceState = {
    language: agent?.voice?.language ?? "en",
    name: agent?.voice?.name ?? "alex",
    style: agent?.voice?.style ?? null,
  };

  const style: StyleState = {
    formality: agent?.style?.formality ?? 5,
    pace: agent?.style?.pace ?? 5,
    calm: agent?.style?.calm ?? 5,
    introvert: agent?.style?.introvert ?? 5,
    empathy: agent?.style?.empathy ?? 5,
    humor: agent?.style?.humor ?? 5,
    creativity: agent?.style?.creativity ?? 5,
    directness: agent?.style?.directness ?? 5,
  };
  const brain: BrainState = {
    id: agent?.brain?.id ?? "",
    instructions: agent?.brain?.instructions ?? "",
  };
  const cards: CardsState = {
    backgroundId: agent?.cards?.backgroundId ?? null,
  };
  const connections: ConnectionsState = {
    items: [],
  };
  return { identity, appearance, voice, style, brain, cards, connections };
}

// Ensure integer style scores 0..10
function toInt010(v?: number, fallback = 5) {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.max(0, Math.min(10, n));
}

function buildPayload(
  identity: { name?: string; role?: string; desc?: string | null; companyName?: string | null },
  appearance: { personaId?: string | null; bgColor?: string | null },
  voice: {
    language?: string; voice?: string;
    name?: number; stylePace?: number;
  },
  style: {
    formality?: number; pace?: number; calm?: number; introvert?: number;
    empathy?: number; humor?: number; creativity?: number; directness?: number;
  },
  brain: { id?: string; instructions?: string | null },
  cards: { backgroundId?: string | null },
  connections: { items: any[] }
) {
  const payload: any = {
    identity: {
      name: identity?.name ?? "",
      role: identity?.role ?? "",
      desc: (identity as any)?.desc ?? (identity as any)?.description ?? null,
    },
    appearance: {
      personaId: appearance?.personaId ?? null,
      bgColor: appearance?.bgColor ?? null,
    },
    voice: {
      language: voice?.language ?? "en",
      name: voice?.name ?? "alex",
    },
    style: {
      formality: toInt010(style?.formality),
      pace: toInt010(style?.pace),
      calm: toInt010(style?.calm),
      introvert: toInt010(style?.introvert),
      empathy: toInt010(style?.empathy ?? 5),
      humor: toInt010(style?.humor ?? 5),
      creativity: toInt010(style?.creativity ?? 5),
      directness: toInt010(style?.directness ?? 5),
    },
    brain: {
      id: brain?.id ?? "",
      instructions: brain?.instructions ?? null,
    },
    cards: {
      backgroundId: cards?.backgroundId ?? null,
    },
  };

  // keep sending connections if your API accepts them here; otherwise it will be ignored
  if (connections && Array.isArray(connections.items)) {
    payload.connections = connections.items;
  }

  return payload;
}

/** Robustly infer edit id:
 * - prefer react-router param `id`
 * - else take last path segment if it's not "create"
 * Supports "/agent/123" and "/agents/123".
 */
function useEditId(): string | undefined {
  const params = useParams<{ id?: string }>();
  const location = useLocation();
  if (params?.id && params.id !== "create") return params.id;
  const seg = (location?.pathname || "").split("/").filter(Boolean).pop();
  if (seg && seg !== "create" && /^\d+$/.test(seg)) return seg;
  return undefined;
}

function StepFooter({ onBack, onNext, nextLabel = "Save & Next" }: { onBack: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="flex items-center justify-between mt-4">
      <button onClick={onBack} className="px-5 py-2 rounded-full bg白/10 hover:bg-white/20 transition font-medium">Back</button>
      <button onClick={onNext} className="px-5 py-2 rounded-full font-extrabold" style={{ backgroundColor: ACCENT, color: "#000" }}>
        {nextLabel}
      </button>
    </div>
  );
}

export default function AgentPage() {
  const editId = useEditId();
  const navigate = useNavigate();

  const [current, setCurrent] = React.useState<StepKey>("identity");

  const [identity, setIdentity] = React.useState<Identity>({ name: "", role: "", desc: "" });
  const [appearance, setAppearance] = React.useState<Appearance>({ personaId: null, bgColor: null });
  const [voice, setVoice] = React.useState<VoiceState>({
    language: "en",
    name: "alex",
  });
  const [style, setStyle] = React.useState<StyleState>({
    formality: 5,
    pace: 5,
    calm: 5,
    introvert: 5,
    empathy: 5,
    humor: 5,
    creativity: 5,
    directness: 5,
  });
  const [brain, setBrain] = React.useState<BrainState>({ id: "", instructions: "" });
  const [cards, setCards] = React.useState<CardsState>({ backgroundId: null });
  const [connections, setConnections] = React.useState<ConnectionsState>({ items: [] });

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showNotif, setShowNotif] = React.useState(false);
  const [notifMessage, setNotifMessage] = React.useState<{ title: string; description?: string; variant?: "info" | "success" | "error" | "warning" }>({ title: "", description: "", variant: "info" });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  const prevConnectionsRef = React.useRef<ConnectionItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (editId) {
          const res = await getAgent(editId);
          const agent = (res as any)?.agent ?? res;
          if (agent) {
            const mapped = serverToLocal(agent);
            if (!cancelled) {
              setIdentity(mapped.identity);
              setAppearance(mapped.appearance);
              setVoice(mapped.voice);
              setStyle(mapped.style);
              setBrain(mapped.brain);
              setCards(mapped.cards);
            }
          }
          // fetch connections but do not block page
          try {
            if (editId) {
              const serverConnections = await listConnections(editId);
              if (!cancelled) {
                setConnections({ items: serverConnections });
                prevConnectionsRef.current = serverConnections; // snapshot for diff
              }
            }
          } catch {
            /* ignore connections error */
          }
        } else {
          // CREATE mode — start clean
          setIdentity({ name: "", role: "", desc: "" });
          setAppearance({ personaId: null, bgColor: null });
          setVoice({
            language: "en",
            name: "alex",
          });
          setStyle({
            formality: 5,
            pace: 5,
            calm: 5,
            introvert: 5,
            empathy: 5,
            humor: 5,
            creativity: 5,
            directness: 5,
          });
          setBrain({ id: "", instructions: "" });
          setCards({ backgroundId: null });
          setConnections({ items: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const next = () =>
    setCurrent((prev) => STEPS[Math.min(STEPS.findIndex((s) => s.key === prev) + 1, STEPS.length - 1)].key);
  const back = () =>
    setCurrent((prev) => STEPS[Math.max(STEPS.findIndex((s) => s.key === prev) - 1, 0)].key);
  const goto = (k: StepKey) => setCurrent(k);

  async function handleConfirmDelete() {
    if (!editId) return;
    try {
      setDeleting(true);
      await deleteAgent(editId);
      setNotifMessage({ title: "Agent deleted.", variant: "success" });
      setShowNotif(true);
      navigate("/agents");
    } catch (e: any) {
      console.error(e);
      setNotifMessage({ title: "Delete failed", description: e?.message, variant: "error" });
      setShowNotif(true);
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }
  async function handleSave() {
    setSaving(true);
    try {
      // Build the agent payload (exclude connections here)
      const payload = buildPayload(
        identity as any,
        appearance as any,
        voice as any,
        style as any,
        brain as any,
        cards as any,
        connections as any
      );

      const agentPayload = {
        identity: payload.identity,
        appearance: payload.appearance,
        voice: payload.voice,
        style: payload.style,
        brain: payload.brain,
        cards: payload.cards,
        draftId: payload.draftId ?? null,
      };

      console.log("Agent: ", payload)

      if (editId) {
        // 1) Update the agent core
        await patchAgent(editId, agentPayload as any);

        // 2) Apply delta for connections against original snapshot
        await saveConnectionsDelta(editId, prevConnectionsRef.current, connections.items);

        // 3) Snapshot the new current
        prevConnectionsRef.current = connections.items;

        setNotifMessage({ title: "Agent updated.", variant: "success" });
        setShowNotif(true);
      } else {
        // CREATE
        // 1) Create the agent first
        const res = await createAgent(agentPayload as any);
        const newId = (res as any)?.agent?.id ?? (res as any)?.id;

        // 2) Save all connections as delta from empty
        if (newId) {
          await saveConnectionsDelta(newId, [], connections.items);
        }

        setNotifMessage({ title: "Agent created.", variant: "success" });
        setShowNotif(true);

        // Optional: navigate to the edit page of the new agent
        // navigate(`/agents/${newId}`);
      }
    } catch (e: any) {
      console.error(e);
      setNotifMessage({
        title: "Failed to save agent.",
        description: e?.message ?? "Please check your input and try again.",
        variant: "error",
      });
      setShowNotif(true);
    } finally {
      setSaving(false);
      const agentSummary = {
        id: editId,
        identity: { name: identity?.name ?? "", role: identity?.role ?? "", desc: identity?.desc ?? null },
        appearance: { personaId: appearance?.personaId ?? null, bgColor: appearance?.bgColor ?? null },
        updatedAt: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent("agents:changed", { detail: { type: "updated", agent: agentSummary } }));

    }
  }

  const active = current;
  const activeIndex = STEPS.findIndex((s) => s.key === active);

  return (
    <>
      <ThreePaneLayout
        sidebar={<SidebarNav />}
        center={<CenterStage saving={saving} />}
        right={
          <div className="h-full pr-7 lg:pr-8">
            {/* === OLD HEADER STYLE (exact HTML/classes; only values changed) === */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#a8a8a8]">{editId ? "Edit" : "Create"} Agent</div>
                <h2 className="text-2xl font-bold">{identity?.name || "Untitled Agent"}</h2>
                <div className="text-sm text-[#a8a8a8]">{identity?.role || "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <button className="grid place-items-center w-10 h-10 rounded-full bg-[#1c1c1c]">
                  <List className="w-5 h-5" />
                </button>
                <button className="grid place-items-center w-10 h-10 rounded-full bg-[#1c1c1c]">
                  <Eye className="w-5 h-5" />
                </button>
                {editId && (
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="grid place-items-center w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white"
                    aria-label="Delete agent"
                    title="Delete agent"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="h-px w-full bg-[#1e1e1e] my-5" />

            {/* === OLD STEP BUTTON STRIP (exact HTML/classes) === */}
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
                    onClick={() => {
                      if (active !== key) goto(key as any);
                    }}
                    title={key}
                    className="grid place-items-center w-11 h-11 rounded-full border border-[#222]"
                    style={{ backgroundColor: bg, color }}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>

            {/* === BODY === */}
            {loading ? (
              <div className="text-gray-400 text-sm">Loading…</div>
            ) : (
              <>
                {active === "identity" && (
                  <>
                    <IdentityForm
                      initial={identity as any}
                      onChange={(p: any) => setIdentity((prev) => ({ ...prev, ...p }))}
                    />
                    <StepFooter onBack={back} onNext={next} />
                  </>
                )}

                {active === "appearance" && (
                  <>
                    <PersonaForm
                      value={appearance ?? undefined}
                      onChange={(p: any) =>
                        setAppearance((prev) => ({ ...prev, personaId: p.id, bgColor: p.bgColor }))
                      }
                    />
                    <StepFooter onBack={back} onNext={next} />
                  </>
                )}

                {active === "voiceSoul" && (
                  <>
                    <VoiceSoulForm
                      initial={{ voice, style } as any}
                      onChange={(d: any) => {
                        setVoice((prev) => ({ ...prev, ...d.voice }));
                        setStyle((prev) => ({ ...prev, ...d.style }));
                      }}
                    />
                    <StepFooter onBack={back} onNext={next} />
                  </>
                )}

                {active === "brain" && (
                  <>
                    <BrainForm
                      initial={brain as any}
                      onChange={(d: any) => setBrain((prev) => ({ ...prev, ...d }))}
                    />
                    <StepFooter onBack={back} onNext={next} />
                  </>
                )}

                {active === "cards" && (
                  <>
                    <BackgroundCardsForm
                      onRequestApply={(bg: any) =>
                        setCards({ backgroundId: bg?.id ?? null })
                      }
                      onChange={(cardsList: any[]) => {
                        if (!cardsList?.length) return;
                        const exists = cardsList.find(
                          (c: any) => c.id === cards.backgroundId
                        );
                        if (!exists) setCards({ backgroundId: cardsList[0].id });
                      }}
                    />
                    <StepFooter onBack={back} onNext={next} />
                  </>
                )}

                {active === "connections" && (
                  <>
                    <ConnectionsForm
                      initial={connections.items}
                      onChange={(items: ConnectionItem[]) => setConnections({ items })}
                    />
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={back}
                        className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition font-medium"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-5 py-2 rounded-full font-extrabold"
                        style={{ backgroundColor: ACCENT, color: "#000" }}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : editId ? "Save Changes" : "Create Agent"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        }
        rightWidth={520}
      />
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => !deleting && setConfirmDeleteOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#121212] p-6 shadow-xl border border-white/10">
            <h3 className="text-lg font-semibold">Delete this agent?</h3>
            <p className="mt-2 text-sm text-gray-300">This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 h-10 rounded-xl border border-white/10"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="px-4 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotif && (
        <InlineNotification
          title={notifMessage.title}
          description={notifMessage.description}
          variant={notifMessage.variant}
          duration={3000}
          onClose={() => setShowNotif(false)}
        />
      )}
    </>
  );
}