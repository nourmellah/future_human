import * as React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

/**
 * Simple, declarative notification popup.
 * Usage:
 *   const [show, setShow] = React.useState(false);
 *   {show && (
 *     <InlineNotification
 *       title="Saved"
 *       description="Your agent has been updated."
 *       variant="success"
 *       duration={3000}
 *       onClose={() => setShow(false)}
 *     />
 *   )}
 */

export type InlineNotificationProps = {
	title?: React.ReactNode;
	description?: React.ReactNode;
	variant?: "success" | "error" | "warning" | "info";
	/** Auto-dismiss after N ms. Omit/0 for sticky. */
	duration?: number;
	/** Called when the notification wants to close (auto-dismiss, ESC, close button). */
	onClose?: () => void;
	/** Where to place the popup on screen. */
	placement?:
	| "top-right"
	| "top-left"
	| "bottom-right"
	| "bottom-left"
	| "top-center"
	| "bottom-center";
	/** Show an ✕ button. */
	closable?: boolean;
	/** Override the default icon. */
	icon?: React.ReactNode;
	/** Extra classes for the card. */
	className?: string;
};

const placements: Record<NonNullable<InlineNotificationProps["placement"]>, string> = {
	"top-right": "top-4 right-4",
	"top-left": "top-4 left-4",
	"bottom-right": "bottom-4 right-4",
	"bottom-left": "bottom-4 left-4",
	"top-center": "top-4 left-1/2 -translate-x-1/2",
	"bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

const variantStyles: Record<NonNullable<InlineNotificationProps["variant"]>, {
	border: string; bg: string; text: string; icon: React.ReactNode; ring: string; role: "status" | "alert";
}> = {
	success: {
		border: "border-green-600/30",
		bg: "bg-[#102017]",
		text: "text-green-200",
		icon: <CheckCircle2 className="w-5 h-5" />,
		ring: "ring-1 ring-green-600/30",
		role: "status",
	},
	error: {
		border: "border-red-600/30",
		bg: "bg-[#1e1010]",
		text: "text-red-200",
		icon: <XCircle className="w-5 h-5" />,
		ring: "ring-1 ring-red-600/30",
		role: "alert",
	},
	warning: {
		border: "border-amber-500/30",
		bg: "bg-[#211b0f]",
		text: "text-amber-200",
		icon: <AlertTriangle className="w-5 h-5" />,
		ring: "ring-1 ring-amber-500/30",
		role: "alert",
	},
	info: {
		border: "border-white/10",
		bg: "bg-[#121212]",
		text: "text-gray-200",
		icon: <Info className="w-5 h-5" />,
		ring: "ring-1 ring-white/15",
		role: "status",
	},
};

const InlineNotification: React.FC<InlineNotificationProps> = ({
	title,
	description,
	variant = "info",
	duration = 3000,
	onClose,
	placement = "top-center",
	closable = true,
	icon,
	className = "",
}) => {
	const vs = variantStyles[variant];

	// Auto-dismiss
	React.useEffect(() => {
		if (!duration) return;
		const t = window.setTimeout(() => onClose?.(), duration);
		return () => window.clearTimeout(t);
	}, [duration, onClose]);

	// ESC to close
	React.useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose?.();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div
			className={`pointer-events-none fixed z-[2147483647] ${placements[placement]} transition-all duration-200`}
			aria-live={vs.role === "alert" ? "assertive" : "polite"}
		>
			<div
				role={vs.role}
				className={[
					"pointer-events-auto min-w-[280px] max-w-[420px] rounded-2xl border shadow-xl backdrop-blur-sm px-4 py-4",
					"relative grid grid-cols-[auto,1fr,auto] items-center gap-3 text-center",
					vs.bg,
					vs.border,
					vs.ring,
					className,
					"opacity-100 translate-y-0 transition-all duration-200",
				].join(" ")}
			>
				<div className={`col-[1] justify-self-start ${vs.text}`}>{icon ?? vs.icon}</div>
				<div className="flex-1">
					{title && <div className="text-sm font-semibold leading-5">{title}</div>}
					{description && (
						<div className="text-xs leading-5 text-gray-300 max-w-[36ch]">{description}</div>
					)}
				</div>
				<div className="col-[3] w-6 h-6" aria-hidden />
				{closable && (
					<button
						onClick={onClose}
						className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-xs text-gray-300 hover:bg-white/5"
						aria-label="Close notification"
					>
						×
					</button>
				)}
			</div>
		</div>
	);
};

export default InlineNotification;
