interface LogoMarkProps {
	size?: number | string;
	className?: string;
	accent?: string;
	src?: string;
	type?: "logo" | "logo-text";
}

export default function LogoMark({
	size = 64,
	src = "/public/assets/logo.png",
	accent = "#E7E31B",
	type = "logo",
	className
}: LogoMarkProps) {
	var error = false;
	const dim = typeof size === "number" ? `${size}px` : size;
	const img = (
		<div
			className={`relative inline-grid place-items-center rounded-full overflow-hidden select-none ${className}`}
			style={{ width: dim, height: dim, backgroundColor: src ? "transparent" : accent }}
			role="img"
		>
			{src && !error ? (
				<img
					src={src}
					// keep image full-bleed inside the circle
					style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
					onError={(e) => {
						// Hide broken image so the fallback circle remains
						const img = e.currentTarget as HTMLImageElement;
						img.style.display = "none";
						error = true;
					}}
				/>
			) : (
				<span className="text-black font-extrabold" style={{ fontSize: typeof size === "number" ? Math.max(8, Math.round((size as number) * 0.45)) : undefined, lineHeight: 1 }}>
					F
				</span>
			)}
		</div>
	);

	return (
		<div className="flex items-center gap-3 select-none">
			{img}
			{type === "logo-text" && (
				<div className="leading-none">
					<div className="text-white font-extrabold tracking-tight text-xl">FUTURE</div>
					<div className="text-white font-extrabold tracking-tight text-xl">
						<span style={{ color: accent }}>HUMAN</span>
					</div>
				</div>
			)}
		</div>
	);
}