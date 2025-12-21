import { ImageResponse } from "next/og";
import { config } from "@/lib/config";

export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

const slogan = "Code Breaks.\nSnap Back.";
const subline = "Visual protection. AI-aware checkpoints. Instant recovery.";

export default async function OpenGraphImage() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "72px",
				background:
					"radial-gradient(circle at 15% 20%, #1f2937 0%, transparent 40%), radial-gradient(circle at 85% 25%, rgba(15, 118, 110, 0.35) 0%, transparent 55%), linear-gradient(135deg, #020617 0%, #0f172a 45%, #020617 100%)",
				color: "#f8fafc",
				fontFamily: "Inter, sans-serif",
			}}
		>
			<header
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "12px",
						backgroundColor: "rgba(15, 23, 42, 0.6)",
						padding: "8px 20px",
						borderRadius: "40px",
						fontSize: "28px",
						fontWeight: 600,
						color: "#5eead4",
					}}
				>
					<img
						src={`${process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev"}/images/logos/png/macOS/Icon-32.png`}
						width="32"
						height="32"
						alt="SnapBack Logo"
						style={{
							width: "32px",
							height: "32px",
						}}
					/>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-end",
						fontSize: "28px",
						color: "#cbd5f5",
						fontWeight: 500,
					}}
				>
					<span>{config.appName}</span>
					<span style={{ fontSize: "22px", color: "#9ca3af" }}>Visual AI protection</span>
				</div>
			</header>

			<main
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "32px",
				}}
			>
				<h1
					style={{
						fontSize: "88px",
						fontWeight: 800,
						lineHeight: 1.05,
						textTransform: "none",
					}}
				>
					{slogan}
				</h1>
				<p
					style={{
						fontSize: "40px",
						color: "#cbd5f5",
						maxWidth: "780px",
						lineHeight: 1.3,
						fontWeight: 500,
					}}
				>
					{subline}
				</p>
			</main>

			<footer
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "28px",
					color: "#94a3b8",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "24px",
						alignItems: "center",
					}}
				>
					<div style={{ fontWeight: 600, color: "#38bdf8" }}>AI-aware checkpoints</div>
					<div style={{ fontWeight: 600, color: "#fbbf24" }}>Hat system for every file</div>
					<div style={{ fontWeight: 600, color: "#f87171" }}>Instant recovery</div>
				</div>
				<div style={{ fontWeight: 500 }}>snapback.dev</div>
			</footer>
		</div>,
		size,
	);
}
