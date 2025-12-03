export class EventBus {
	private listeners: Map<string, Array<(payload: any) => void>> = new Map();

	subscribe(event: string, callback: (payload: any) => void) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event)?.push(callback);
		return () => this.unsubscribe(event, callback);
	}

	unsubscribe(event: string, callback: (payload: any) => void) {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			this.listeners.set(
				event,
				callbacks.filter((cb) => cb !== callback),
			);
		}
	}

	publish(event: string, payload: any) {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.forEach((cb) => {
				cb(payload);
			});
		}
	}
}
