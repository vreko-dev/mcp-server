interface TierCardProps {
	emoji: string;
	name: string;
	range: string;
	benefits: string[];
	highlight?: boolean;
}

export function TierCard({ emoji, name, range, benefits, highlight }: TierCardProps) {
	return (
		<div
			className={`rounded-lg border p-4 ${
				highlight ? "border-emerald-500 bg-emerald-500/10" : "border-gray-700 bg-gray-800/50"
			}`}
		>
			<div className="mb-2 flex items-center gap-2">
				<span className="text-2xl">{emoji}</span>
				<span className="font-bold">{name}</span>
			</div>
			<div className="mb-3 text-sm text-gray-400">{range}</div>
			<ul className="space-y-1">
				{benefits.map((b, i) => (
					<li key={i} className="flex items-start gap-2 text-sm">
						<span className="text-emerald-500">✓</span>
						{b}
					</li>
				))}
			</ul>
		</div>
	);
}
