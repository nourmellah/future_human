import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LogoMark from "./LogoMark";
import { listAgents } from "../services/agents";

export type Agent = {
  id: number | string;
  identity?: { name?: string; role?: string; desc?: string | null };
  appearance?: { personaId?: string | null; bgColor?: string | null };
  updatedAt?: string;
  thumbnail?: string;
};

export type SidebarNavProps = {
  agents?: Agent[];          // optional external override
  className?: string;
  children?: React.ReactNode;
};

const ACCENT = "#E7E31B";
const FALLBACK_THUMB = "/public/assets/personas/placeholder.png";

const getAgentName = (a: Agent) =>
  a?.identity?.name?.trim() || (typeof a?.id !== "undefined" ? `Agent #${a.id}` : "Agent");

const getAgentRole = (a: Agent) => a?.identity?.role ?? "";

const getAgentThumb = (a: Agent) =>
  a?.thumbnail
    ? a.thumbnail
    : a?.appearance?.personaId
    ? `/public/assets/personas/${a.appearance.personaId}.png`
    : FALLBACK_THUMB;

export const SidebarAgentCard: React.FC<{
  agent: Agent;
  active?: boolean;
  onClick?: (a: Agent) => void;
}> = ({ agent, active, onClick }) => {
  return (
    <button
      onClick={() => onClick?.(agent)}
      className="w-full text-left focus:outline-none group"
      aria-label={`Open ${getAgentName(agent)}`}
    >
      <div
        className={`
          relative aspect-square rounded-2xl overflow-hidden border-2
          transition-all duration-200 ease-out
          ${active ? "border-[var(--accent)] scale-[1.01]" : "border-transparent"}
          hover:border-[var(--accent)] hover:scale-[1.01]
        `}
        style={{ ["--accent" as any]: ACCENT }}
      >
        <img
          src={getAgentThumb(agent)}
          alt={getAgentName(agent)}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-x-0 bottom-0">
          <div className="bg-[#232327]/95 text-white text-center px-4 py-2">
            <div className="text-base font-extrabold leading-tight truncate">{getAgentName(agent)}</div>
            <div className="text-[11px] text-white/60 truncate">{getAgentRole(agent)}</div>
          </div>
        </div>
      </div>
    </button>
  );
};

const SidebarNav: React.FC<SidebarNavProps> = ({
  agents: overrideAgents,
  className = "",
  children,
}) => {
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id?: string }>();

  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res: any = await listAgents();
        const data = Array.isArray(res) ? res : (res?.agents ?? []);
        setAgents(data);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const onAgentClick = (a: Agent) => navigate(`/agents/${a.id}`);
  const data = overrideAgents ?? agents;

  return (
    <nav className={`h-full flex flex-col ${className}`} aria-label="Sidebar">
      <style>{`.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none } .no-scrollbar::-webkit-scrollbar{ display:none }`}</style>

      <header className="flex-none h-40 md:h-48 px-2">
        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
          <LogoMark src={"/public/assets/logo.png"} size={96} />
          <Link to="/create" className="flex items-center gap-3 text-white font-extrabold select-none" aria-label="Create Agent">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-white text-black text-2xl leading-none">+</span>
            <span className="uppercase leading-[0.95] text-[20px] text-left">
              CREATE<br />AGENT
            </span>
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-1 space-y-2">
        {children}
        {loading && <div className="text-gray-400 text-sm px-3 py-2">Loading agents…</div>}
        {error ? <div className="text-red-400 text-sm px-3 py-2">Failed to load agents.</div> : null}
        {!loading && !error && data.map((a) => {
          const active = String(a.id) === String(activeId ?? "");
          return (
            <div key={String(a.id)}>
              <SidebarAgentCard agent={a} active={active} onClick={onAgentClick} />
            </div>
          );
        })}
        {!loading && !error && data.length === 0 && (
          <div className="text-gray-400 text-sm px-3 py-2">No agents yet.</div>
        )}
      </div>

      <footer className="flex-none px-0 p-0 m-0 mt-auto">
        <button className="w-full h-14 md:h-16 flex items-center justify-center text-center p-0 m-0">
          <Link to="/account" className="block text-white font-extrabold uppercase tracking-wide">
            Account
          </Link>
        </button>
      </footer>
    </nav>
  );
};

export default SidebarNav;
