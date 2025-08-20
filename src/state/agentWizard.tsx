import React from "react";

/* ---------- Step order ---------- */
export const STEPS = [
  "identity",
  "appearance",
  "voiceSoul",
  "brain",
  "cards",
  "connections",
] as const;
export type StepId = typeof STEPS[number];

/* ---------- Slices ---------- */
export type IdentityData = { name: string; role: string; description: string };
export type AppearanceData = { personaId: string | null };
export type VoiceSoulData = {
  language: string; voice: string;
  styleFormality: number; stylePace: number;
  tempCalm: number; tempIntrovert: number;
  empathy: number; humor: number; creativity: number; directness: number;
};
export type BrainData = { brainId: string; instructions: string };
export type CardsData = { backgroundId: string | null };
export type Connection = {
  id: string; providerId: string;
  status: "connected" | "needs_setup" | "error";
  config?: Record<string,string>;
  token?: string;
};
export type ConnectionsData = { items: Connection[] };

/* ---------- Full state ---------- */
export type WizardState = {
  current: StepId;
  identity: IdentityData;
  appearance: AppearanceData;
  voiceSoul: VoiceSoulData;
  brain: BrainData;
  cards: CardsData;
  connections: ConnectionsData;
  draftId?: string;
  updatedAt: number;
};

/* ---------- Defaults ---------- */
export const defaultState: WizardState = {
  current: "identity",
  identity: { name: "", role: "", description: "" },
  appearance: { personaId: null },
  voiceSoul: {
    language: "en", voice: "alex",
    styleFormality: 5, stylePace: 5,
    tempCalm: 5, tempIntrovert: 5,
    empathy: 5, humor: 5, creativity: 5, directness: 5,
  },
  brain: { brainId: "level1", instructions: "" },
  cards: { backgroundId: null },
  connections: { items: [] },
  updatedAt: Date.now(),
};

/* ---------- Reducer ---------- */
type Action =
  | { type: "SET_STEP"; step: StepId }
  | { type: "SAVE"; step: StepId; data: any }
  | { type: "LOAD_MERGE"; saved: Partial<WizardState>; preserveCurrent?: boolean }
  | { type: "SET_DRAFT_ID"; id: string }
  | { type: "RESET" };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "SET_STEP":
      if (state.current === action.step) return state;
      return { ...state, current: action.step, updatedAt: Date.now() };

    case "SAVE":
      return {
        ...state,
        [action.step]: { ...(state as any)[action.step], ...action.data },
        updatedAt: Date.now(),
      };

    case "LOAD_MERGE": {
      const merged = { ...state, ...action.saved } as WizardState;
      if (action.preserveCurrent) merged.current = state.current;
      return { ...merged, updatedAt: Date.now() };
    }

    case "SET_DRAFT_ID":
      return { ...state, draftId: action.id, updatedAt: Date.now() };

    case "RESET":
      return { ...defaultState, updatedAt: Date.now() };

    default:
      return state;
  }
}

/* ---------- Persistence ---------- */
const LS_KEY = "fh:wizard:draft:v2";

function loadFromLocal(): Partial<WizardState> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<WizardState>;
  } catch {
    return null;
  }
}

function saveToLocal(state: WizardState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

/* ---------- Context ---------- */
type Ctx = {
  state: WizardState;
  save: <K extends StepId>(step: K, data: Partial<WizardState[K]>) => void;
  goto: (step: StepId) => void;
  next: () => void;
  back: () => void;
  saveDraft: () => Promise<void>;
  submit: () => Promise<void>;
  isHydrated: boolean;
};
const WizardContext = React.createContext<Ctx | null>(null);

/* ---------- Provider ---------- */
export function AgentWizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, defaultState);
  const hydratedRef = React.useRef(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Hydrate ONCE from localStorage on mount.
  React.useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const saved = loadFromLocal();
    if (saved) {
      dispatch({ type: "LOAD_MERGE", saved, preserveCurrent: true });
    }
    setIsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave (200ms)
  const debounceRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!isHydrated) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      saveToLocal(state);
      debounceRef.current = null;
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [state, isHydrated]);

  // Stable helpers
  const goto = React.useCallback((step: StepId) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const next = React.useCallback(() => {
    const idx = STEPS.indexOf(state.current);
    if (idx < STEPS.length - 1) dispatch({ type: "SET_STEP", step: STEPS[idx + 1] });
  }, [state.current]);

  const back = React.useCallback(() => {
    const idx = STEPS.indexOf(state.current);
    if (idx > 0) dispatch({ type: "SET_STEP", step: STEPS[idx - 1] });
  }, [state.current]);

  const save = React.useCallback(<K extends StepId>(step: K, data: Partial<WizardState[K]>) => {
    dispatch({ type: "SAVE", step, data });
  }, []);

  const saveDraft = React.useCallback(async () => {
    saveToLocal(state);
    dispatch({ type: "SET_DRAFT_ID", id: state.draftId ?? "local" });
  }, [state]);

  const submit = React.useCallback(async () => {
    // TODO: replace with POST to your Spring Boot API
    console.log("SUBMIT agent:", state);
  }, [state]);

  const value = React.useMemo<Ctx>(() => ({
    state,
    save,
    goto: (s) => { if (state.current !== s) goto(s); }, // idempotent
    next,
    back,
    saveDraft,
    submit,
    isHydrated,
  }), [state, save, goto, next, back, saveDraft, submit, isHydrated]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useAgentWizard() {
  const ctx = React.useContext(WizardContext);
  if (!ctx) throw new Error("useAgentWizard must be used inside <AgentWizardProvider>");
  return ctx;
}
