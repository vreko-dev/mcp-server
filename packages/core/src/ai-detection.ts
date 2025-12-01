export type ChangeEvent = { file: string; size: number; timestamp: number };
export type AIDetectionResult = { confidence: number; patterns: string[] };

export class AIDetectionEngine {
	analyze(events: ChangeEvent[]): AIDetectionResult {
		const bursts = events.filter((e) => Date.now() - e.timestamp < 10000 && e.size > 2000).length;
		const confidence = Math.min(1, bursts / 5);
		const patterns = confidence > 0.6 ? ["burst-write"] : [];
		return { confidence, patterns };
	}
}
