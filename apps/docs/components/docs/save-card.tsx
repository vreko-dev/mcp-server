interface SaveCardProps {
	tool: "Cursor" | "Copilot" | "Claude Code" | "Windsurf";
	disaster: string;
	filesAffected: number;
	restoreTime: string;
	quote?: string;
}

const toolColors: Record<SaveCardProps["tool"], string> = {
	Cursor: "border-blue-500",
	Copilot: "border-purple-500",
	"Claude Code": "border-orange-500",
	Windsurf: "border-cyan-500",
};

export function SaveCard({ tool, disaster, filesAffected, restoreTime, quote }: SaveCardProps) {
	return (
		<div className={`rounded-lg border-l-4 bg-gray-800/50 p-4 ${toolColors[tool]}`}>
			<div className="mb-2 flex items-center justify-between">
				<span className="font-bold">{tool}</span>
				<span className="text-xs text-gray-400">{filesAffected} files</span>
			</div>
			<p className="mb-3 text-sm text-gray-300">{disaster}</p>
			<div className="flex items-center justify-between text-xs">
				<span className="text-emerald-400">Restored in {restoreTime}</span>
			</div>
			{quote && <p className="mt-3 text-xs italic text-gray-500">&quot;{quote}&quot;</p>}
		</div>
	);
}
