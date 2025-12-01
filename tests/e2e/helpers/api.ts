import type { APIRequestContext } from "@playwright/test";

/**
 * API client for direct API calls
 */
export class ApiClient {
	private baseURL: string;
	private authToken?: string;

	constructor(baseURL: string, authToken?: string) {
		this.baseURL = baseURL;
		this.authToken = authToken;
	}

	/**
	 * Set authentication token
	 */
	setAuthToken(token: string): void {
		this.authToken = token;
	}

	/**
	 * Make a GET request
	 */
	async get(endpoint: string, options: { headers?: Record<string, string> } = {}): Promise<any> {
		const url = `${this.baseURL}${endpoint}`;
		const headers = this.buildHeaders(options.headers);

		const response = await fetch(url, {
			method: "GET",
			headers,
		});

		return this.handleResponse(response);
	}

	/**
	 * Make a POST request
	 */
	async post(endpoint: string, data: any, options: { headers?: Record<string, string> } = {}): Promise<any> {
		const url = `${this.baseURL}${endpoint}`;
		const headers = this.buildHeaders(options.headers);

		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(data),
		});

		return this.handleResponse(response);
	}

	/**
	 * Make a PUT request
	 */
	async put(endpoint: string, data: any, options: { headers?: Record<string, string> } = {}): Promise<any> {
		const url = `${this.baseURL}${endpoint}`;
		const headers = this.buildHeaders(options.headers);

		const response = await fetch(url, {
			method: "PUT",
			headers,
			body: JSON.stringify(data),
		});

		return this.handleResponse(response);
	}

	/**
	 * Make a DELETE request
	 */
	async delete(endpoint: string, options: { headers?: Record<string, string> } = {}): Promise<any> {
		const url = `${this.baseURL}${endpoint}`;
		const headers = this.buildHeaders(options.headers);

		const response = await fetch(url, {
			method: "DELETE",
			headers,
		});

		return this.handleResponse(response);
	}

	/**
	 * Build headers with authentication
	 */
	private buildHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...additionalHeaders,
		};

		if (this.authToken) {
			headers["Authorization"] = `Bearer ${this.authToken}`;
		}

		return headers;
	}

	/**
	 * Handle API response
	 */
	private async handleResponse(response: Response): Promise<any> {
		const contentType = response.headers.get("content-type");
		let data: any;

		if (contentType && contentType.includes("application/json")) {
			data = await response.json();
		} else {
			data = await response.text();
		}

		if (!response.ok) {
			throw new Error(`API Error: ${response.status} - ${data.message || data}`);
		}

		return data;
	}
}

/**
 * Request helpers with auth
 */
export function createApiHelpers(request: APIRequestContext) {
	return {
		/**
		 * Create API key
		 */
		async createApiKey(authToken: string) {
			const response = await request.post("/api/v1/api-keys", {
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				data: {
					name: "Test API Key",
					permissions: ["read", "write"],
				},
			});

			return response.json();
		},

		/**
		 * Get user profile
		 */
		async getUserProfile(authToken: string) {
			const response = await request.get("/api/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			});

			return response.json();
		},
	};
}
