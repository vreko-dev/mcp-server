import http from "node:http";
import type { AddressInfo } from "node:net";

export interface TelemetrySpy {
	url: string;
	hits: Array<{
		url: string | undefined;
		method: string | undefined;
		body: string;
	}>;
	close: () => void;
}

/**
 * Start a local HTTP server spy for telemetry/network requests
 * Use this instead of nock/sinon network mocks in integration tests
 *
 * @example
 * ```ts
 * const spy = startTelemetrySpy();
 * // Configure your telemetry client to use spy.url
 * // ... perform actions ...
 * expect(spy.hits).toHaveLength(2);
 * expect(spy.hits[0].url).toBe('/events');
 * spy.close();
 * ```
 */
export function startTelemetrySpy(): TelemetrySpy {
	const hits: TelemetrySpy["hits"] = [];

	const server = http.createServer((req, res) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk;
		});
		req.on("end", () => {
			hits.push({
				url: req.url,
				method: req.method,
				body,
			});
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true }));
		});
	});

	server.listen(0); // Random available port
	const port = (server.address() as AddressInfo).port;

	return {
		url: `http://127.0.0.1:${port}`,
		hits,
		close: () => {
			server.close();
		},
	};
}
