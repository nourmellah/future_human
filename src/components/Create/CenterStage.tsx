import { Maximize2, Minimize2, Send, Volume2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import LoadingOverlay from "../LoadingOverlay";
import { createPortal } from "react-dom";

const ACCENT = "#E7E31B";
const DURATION = 200; // ms

export type CenterStageProps = {
	/** Background image/video/canvas placeholder. You can replace the <img> with a canvas later. */
	bg?: string;
	/** Optionally disable the chat bar */
	showChat?: boolean;
	onFullscreenChange?: (isFullscreen: boolean) => void; // optional callback
	creating?: boolean;                  // show the blur overlay
	creatingText?: string;               // optional custom text
};

/**
 * CenterStage — fills ALL available height/width of the center pane.
 * Rounded container with the agent in the background and overlay controls.
 */
export default function CenterStage({
	bg = "/assets/agent-stage.jpg",
	showChat = true,
	onFullscreenChange,
	creating = false,
	creatingText = "Creating in progress",
}: CenterStageProps) {
	const [sending, setSending] = useState(false);
	const [message, setMessage] = useState("");

	// fullscreen states: mounted (portal exists) + active (visible; animates opacity/scale)
	const [fsMounted, setFsMounted] = useState(false);
	const [fsActive, setFsActive] = useState(false);

	const [dots, setDots] = useState("");
	useEffect(() => {
		if (!creating) {
			setDots("");
			return;
		}
		const id = setInterval(() => {
			setDots((d) => (d.length >= 3 ? "" : d + "."));
		}, 400);
		return () => clearInterval(id);
	}, [creating]);


	// Toggle fullscreen with small animation (0.2s)
	function enterFs() {
		setFsMounted(true);
		// next frame to allow transition
		requestAnimationFrame(() => {
			setFsActive(true);
			onFullscreenChange?.(true);
		});
	}
	function exitFs() {
		setFsActive(false);
		setTimeout(() => {
			setFsMounted(false);
			onFullscreenChange?.(false);
		}, DURATION);
	}
	const isFullscreen = fsMounted && fsActive;

	// lock page scroll & Esc to exit
	useEffect(() => {
		const root = document.documentElement;
		if (fsMounted) root.classList.add("overflow-hidden");
		else root.classList.remove("overflow-hidden");

		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape" && fsMounted) exitFs();
		}
		if (fsMounted) window.addEventListener("keydown", onKey);
		return () => {
			root.classList.remove("overflow-hidden");
			window.removeEventListener("keydown", onKey);
		};
	}, [fsMounted]);


	function fakeSend(e: React.FormEvent) {
		e.preventDefault();
		if (!message.trim()) return;
		setSending(true);
		setTimeout(() => {
			setSending(false);
			setMessage("");
		}, 800);
	}

	const StageShell = (
		<div className="relative h-full w-full rounded-3xl overflow-hidden bg-[#0c0c0c]">
			{/* Background (swap with <canvas/> later) */}
			{bg && (
				<img
					src={bg}
					alt="Agent stage"
					className="absolute inset-0 w-full h-full object-cover"
					onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
				/>
			)}

			{/* Overlay grid */}
			<div className="absolute inset-0 grid grid-rows-[auto_1fr_auto]">
				{/* Top bar */}
				<div className="p-3 sm:p-4 flex items-center gap-3">
					<button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center bg-black/60 text-white">
						<Zap className="w-5 h-5" />
					</button>
					<button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center bg-black/60 text-white">
						<Volume2 className="w-5 h-5" />
					</button>
					<button
						className="ml-auto w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center bg-black/60 text-white"
						onClick={() => (fsMounted ? exitFs() : enterFs())}
						title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
					>
						{isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
					</button>
				</div>

				{/* Middle spacer (agent sits behind) */}
				<div />

				{/* Bottom chat bar */}
				{showChat && (
					<form onSubmit={fakeSend} className="p-3 sm:p-4 flex items-center gap-3">
						<input
							className="flex-1 rounded-full bg-white/90 text-black placeholder-black/60 px-4 sm:px-5 py-3"
							placeholder="Type your message..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
						/>
						<button
							type="submit"
							className="w-11 h-11 sm:w-12 sm:h-12 rounded-full grid place-items-center"
							style={{ backgroundColor: ACCENT }}
						>
							<Send className="w-5 h-5 text-black" />
						</button>
					</form>
				)}

				{/* NEW: Creating overlay (blurs stage + blocks interaction) */}
				{creating && (
					<div className="absolute inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center">
						<div className="text-center px-6 py-4 rounded-2xl bg-black/40 border border-white/10">
							<div className="text-white text-lg sm:text-xl font-extrabold">
								{creatingText}
								<span aria-live="polite">{dots}</span>
							</div>
							<div className="mt-1 text-xs text-white/70">
								Please wait…
							</div>
						</div>
					</div>
				)}

			</div>

			<LoadingOverlay open={sending} gifSrc="src/assets/loader.gif" size={140} dimOpacity={0.2} />
		</div>
	);

	// Normal (inside center column)
	if (!fsMounted) {
		return <div className="h-full min-h-full">{StageShell}</div>;
	}

	// Fullscreen overlay with fast fade/scale
	return createPortal(
		<div
			className={`fixed inset-0 z-[9999] bg-black transition-opacity duration-200 ${fsActive ? "opacity-100" : "opacity-0"
				}`}
		>
			<div className="absolute inset-0 p-3 sm:p-6">
				<div
					className={`h-full w-full transition-transform duration-200 ${fsActive ? "scale-100" : "scale-95"
						}`}
				>
					{StageShell}
				</div>
			</div>
		</div>,
		document.body
	);
}
