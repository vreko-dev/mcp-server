import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);

		// ?lines=500
		const lines = searchParams.get("lines") || "???";
		const hasLines = searchParams.has("lines");

		const message = hasLines
			? `Recovered ${lines} lines of code`
			: "SnapBack saved the day";

		return new ImageResponse(
			<div
				style={{
					height: "100%",
					width: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "#020617", // slate-950
					backgroundImage: "linear-gradient(to bottom right, #0f172a, #020617)",
					fontFamily: "sans-serif",
				}}
			>
				{/* Background Accents */}
				<div
					style={{
						position: "absolute",
						top: "-200px",
						left: "-200px",
						width: "600px",
						height: "600px",
						backgroundColor: "#10b981", // emerald-500
						opacity: "0.1",
						filter: "blur(100px)",
						borderRadius: "50%",
					}}
				/>
				<div
					style={{
						position: "absolute",
						bottom: "-200px",
						right: "-200px",
						width: "600px",
						height: "600px",
						backgroundColor: "#3b82f6", // blue-500
						opacity: "0.1",
						filter: "blur(100px)",
						borderRadius: "50%",
					}}
				/>

				{/* Content Container */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 10,
						padding: "40px",
					}}
				>
					{/* Logo / Brand */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							marginBottom: "40px",
						}}
					>
						<div style={{ fontSize: 60 }}>🛡️</div>
						<div
							style={{
								fontSize: 40,
								fontWeight: 700,
								color: "#f8fafc", // slate-50
								letterSpacing: "-0.02em",
							}}
						>
							SnapBack
						</div>
					</div>

					{/* Main Message */}
					<div
						style={{
							fontSize: 80,
							fontWeight: 800,
							backgroundClip: "text",
							color: "transparent",
							backgroundImage: "linear-gradient(to right, #34d399, #60a5fa)", // emerald-400 to blue-400
							textAlign: "center",
							lineHeight: 1.1,
							maxWidth: "900px",
						}}
					>
						{message}
					</div>

					{/* Subtitle */}
					<div
						style={{
							fontSize: 32,
							color: "#94a3b8", // slate-400
							marginTop: "30px",
							textAlign: "center",
						}}
					>
						Automatic localized backups for VS Code
					</div>
				</div>
			</div>,
			{
				width: 1200,
				height: 630,
			},
		);
	} catch (e: any) {
		console.log(`${e.message}`);
		return new Response("Failed to generate the image", {
			status: 500,
		});
	}
}
