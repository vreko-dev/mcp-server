const dataRows = [
	{
		data: "Source code contents",
		collected: "Never",
		defaultSetting: "n/a",
		storage: "n/a",
		purpose: "n/a",
	},
	{
		data: "File paths",
		collected: "Optional",
		defaultSetting: "Off",
		storage: "Hashed locally",
		purpose: "Session grouping",
	},
	{
		data: "File types (.ts, .py)",
		collected: "Optional",
		defaultSetting: "Off",
		storage: "Cloud (if enabled)",
		purpose: "Detection accuracy",
	},
	{
		data: "Event metadata",
		collected: "Optional",
		defaultSetting: "Off",
		storage: "Cloud (if enabled)",
		purpose: "Improve detection",
	},
	{
		data: "Restore history",
		collected: "Yes",
		defaultSetting: "On",
		storage: "Local only",
		purpose: "Risk scoring",
	},
	{
		data: "AI tool detected",
		collected: "Optional",
		defaultSetting: "Off",
		storage: "Cloud (if enabled)",
		purpose: "Tool-specific learning",
	},
];

export function DataCollectionTable() {
	return (
		<div className="my-6 overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-gray-700">
						<th className="py-2 text-left">Data</th>
						<th className="py-2 text-left">Collected?</th>
						<th className="py-2 text-left">Default</th>
						<th className="py-2 text-left">Storage</th>
						<th className="py-2 text-left">Purpose</th>
					</tr>
				</thead>
				<tbody>
					{dataRows.map((row, i) => (
						<tr key={i} className="border-b border-gray-800">
							<td className="py-2">{row.data}</td>
							<td className={`py-2 ${row.collected === "Never" ? "font-bold text-emerald-400" : ""}`}>
								{row.collected}
							</td>
							<td className="py-2">{row.defaultSetting}</td>
							<td className="py-2">{row.storage}</td>
							<td className="py-2 text-gray-400">{row.purpose}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
