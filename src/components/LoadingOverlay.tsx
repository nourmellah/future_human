import React from "react";

/**
 * LoadingOverlay — dims the screen and shows a centered GIF.
 *
 * Usage:
 *   <LoadingOverlay gifSrc="src/assets/loader.gif" />
 *   <LoadingOverlay open={isLoading} gifSrc="src/assets/loader.gif" size={300} />
 */

export interface LoadingOverlayProps {
	/** Controls visibility. Defaults to true so it can be used in Suspense fallback without props */
	open?: boolean;
	/** Path to your GIF */
	gifSrc?: string;
	/** Pixel size for the GIF (or any CSS size string). Default: 180 */
	size?: number | string;
	/** Backdrop opacity 0..1. Default: 0.6 */
	dimOpacity?: number;
	/** Apply a subtle blur behind the overlay. Default: true */
	blur?: boolean;
	/** Extra classes for the backdrop container */
	className?: string;
	/** Accessible alt text for the image. Default: "Loading" */
	alt?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
	open = true,
	gifSrc = "src/assets/loader.gif",
	size = 300,
	dimOpacity = 0.6,
	blur = true,
	className = "",
	alt = "Loading",
}) => {
	if (!open) return null;
	const sizeValue = typeof size === "number" ? `${size}px` : size;

	return (
		<div
			className={`fixed inset-0 z-[9999] flex items-center justify-center ${className}`}
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			{/* Backdrop */}
			<div
				className={`absolute inset-0 ${blur ? "backdrop-blur-sm" : ""}`}
				style={{ backgroundColor: `rgba(0,0,0,${dimOpacity})` }}
			/>

			{/* Centered GIF */}
			<img
				src={gifSrc}
				alt={alt}
				className="relative select-none"
				style={{ width: sizeValue, height: sizeValue }}
				decoding="async"
				loading="eager"
			/>
		</div>
	);
};

export default LoadingOverlay;
