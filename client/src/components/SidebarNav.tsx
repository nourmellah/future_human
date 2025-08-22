import React from "react";
import { Link, useNavigate } from "react-router-dom";
import LogoMark from "./LogoMark";
import { useAgents } from "../AgentsProvider";

export type Agent = {
  id: number | string;
  identity?: { name?: string; role?: string; desc?: string | null };
  appearance?: { personaId?: string | null; bgColor?: string | null };
  updatedAt?: string;
  thumbnail?: string; // keep if your JSX references agent.thumbnail
};

export type SidebarNavProps = {
	agents?: Agent[];
	activeAgentId?: string;
	className?: string;
	renderAgent?: (agent: Agent, active: boolean, onClick: () => void) => React.ReactNode;
};

const ACCENT = "#E7E31B";
const FALLBACK_THUMB = "/assets/agent-placeholder.png"; // or your existing fallback

const getAgentName = (a: Agent) =>
  a?.identity?.name ?? `Agent #${a?.id ?? "?"}`;

const getAgentRole = (a: Agent) =>
  a?.identity?.role ?? "";

const getAgentThumb = (a: Agent) =>
  a?.thumbnail
    ? a.thumbnail
    : a?.appearance?.personaId
    ? `/assets/personas/${a.appearance.personaId}.png`
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
        {/* image */}
        <img
          src={getAgentThumb(agent)}
          alt={getAgentName(agent)}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />

        {/* FULL-WIDTH BOTTOM BAR — not floating */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="bg-[#232327]/95 text-white text-center px-4 py-2">
            <div className="text-base font-extrabold leading-tight truncate">{getAgentName(agent)}</div>
            <div className="text-[11px] uppercase tracking-widest leading-tight opacity-90 truncate">
              {getAgentRole(agent) || " "}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};


const SidebarNav: React.FC<React.PropsWithChildren<SidebarNavProps>> = ({
	activeAgentId,
	className = "",
	renderAgent,
	children,
}) => {
	const navigate = useNavigate();
	const { agents, loading, refresh } = useAgents();

	const onAgentClick = (agent: Agent) => {
		navigate(`/agents/${agent.id}`);
	};

	return (
		<nav className={`h-full flex flex-col ${className}`} aria-label="Sidebar">
			{/* Hide scrollbars utility (scoped) */}
			<style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>


			{/* HEADER — vertically centered block (logo + Create) */}
			<header className="flex-none h-40 md:h-48 px-2">
				<div className="w-full h-full flex flex-col items-center justify-center gap-4">
					<LogoMark src={"src/assets/logo.png"} size={96} />
					<Link to="/create" className="flex items-center gap-3 text-white font-extrabold select-none" aria-label="Create Agent">
						<span className="grid place-items-center w-8 h-8 rounded-full bg-white text-black text-2xl leading-none">+</span>
						<span className="uppercase leading-[0.95] text-[20px] text-left">
							CREATE<br />
							AGENT
						</span>
					</Link>
				</div>
			</header>

			{/* Scrollable list of agents — minimal side padding so cards are larger */}
			<div className="flex-1 overflow-y-auto no-scrollbar px-1 space-y-2">
				{children}
				{agents.map((a) => {
					const active = a.id === activeAgentId;
					const click = () => onAgentClick(a);
					return (
						<div key={a.id}>
							{renderAgent ? (
								renderAgent(a, active, click)
							) : (
								<SidebarAgentCard agent={a} active={active} onClick={onAgentClick} />
							)}
						</div>
					);
				})}
			</div>

			{/* FOOTER — vertically centered, reduced vertical space */}
			<footer className="flex-none px-0 p-0 m-0 mt-auto">
				<button className="w-full h-14 w-7 md:h-16 flex items-center justify-center text-center p-0 m-0">
					<Link to="/account" className="block text-white font-extrabold uppercase tracking-wide">
						Account
					</Link>
				</button>
			</footer>
		</nav>
	);
};

export default SidebarNav;
