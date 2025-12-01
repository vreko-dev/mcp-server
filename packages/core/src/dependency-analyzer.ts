export type DependencyRisk = { score: number; breaking: string[] };

type PackageManifest = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
};

export class DependencyAnalyzer {
	quickAnalyze(before: PackageManifest, after: PackageManifest): DependencyRisk {
		const breaking: string[] = [];
		let score = 0;
		const next = after?.dependencies || {};
		const prev = before?.dependencies || {};

		for (const [name, ver] of Object.entries(next)) {
			const prevVer = prev[name];
			if (!prevVer) {
				continue;
			}
			if (isMajorBump(String(prevVer), String(ver))) {
				breaking.push(`${name}:${prevVer}→${ver}`);
				score = Math.max(score, 0.7);
			}
		}
		return { score, breaking };
	}
}

export function isMajorBump(prev: string, next: string) {
	const [a] = String(prev)
		.replace(/^[^0-9]*/, "")
		.split(".");
	const [b] = String(next)
		.replace(/^[^0-9]*/, "")
		.split(".");
	return Number(b) > Number(a);
}
