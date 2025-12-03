export class EventBus {
	m = new Map();
	on(k, h) {
		const set = this.m.get(k) ?? new Set();
		set.add(h);
		this.m.set(k, set);
		return () => set.delete(h);
	}
	emit(k, p) {
		const handlers = this.m.get(k);
		if (handlers) {
			// Use Array.from to convert Set to Array for iteration
			const handlersArray = Array.from(handlers);
			for (const h of handlersArray) {
				h(p);
			}
		}
	}
}
