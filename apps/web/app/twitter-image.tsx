import { ImageResponse } from "next/og";

export const size = {
	width: 1200,
	height: 675,
};

export const contentType = "image/png";

const baseGradient =
	"linear-gradient(135deg, rgba(14, 165, 233, 0.45) 0%, rgba(29, 78, 216, 0.35) 25%, rgba(8, 47, 73, 0.9) 60%, rgba(15, 23, 42, 1) 100%)";

export default async function TwitterImage({
	searchParams,
}: {
	searchParams: { variant?: string };
}) {
	const isAlt = searchParams?.variant === "alt";
	const headline = isAlt ? "Recover in Seconds" : "Code Breaks.\nSnap Back.";
	const subline = isAlt
		? "Track AI changes, preview diffs, restore instantly."
		: "Visual protection for every file. AI-aware checkpoints.";

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "64px",
				background: baseGradient,
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
					}}
				>
					<img
						src={`${process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev"}/images/logos/png/macOS/Icon-64.png`}
						width="48"
						height="48"
						alt="SnapBack Logo"
						style={{
							width: "48px",
							height: "48px",
						}}
					/>
				</div>
				<div
					style={{
						padding: "8px 18px",
						borderRadius: "24px",
						border: "1px solid rgba(148, 163, 184, 0.35)",
						fontSize: "24px",
						color: "#cbd5f5",
					}}
				>
					AI Code Protection
				</div>
			</header>

			<main
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "24px",
					maxWidth: "820px",
				}}
			>
				<h1
					style={{
						fontSize: "84px",
						fontWeight: 800,
						lineHeight: 1.05,
					}}
				>
					{headline}
				</h1>
				<p
					style={{
						fontSize: "36px",
						color: "#e2e8f0",
						fontWeight: 500,
						lineHeight: 1.35,
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
					fontSize: "26px",
					color: "#bfdbfe",
				}}
			>
				<div style={{ display: "flex", gap: "20px" }}>
					<span>🔥 Hat system</span>
					<span>🧠 AI signals</span>
					<span>⏱️ 2.3s recovery</span>
				</div>
				<span>snapback.dev</span>
			</footer>
		</div>,
		size,
	);
}
