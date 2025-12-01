/**
 * Example usage of the MCP Client with SnapBack MCP Server
 *
 * This example shows how to connect to external MCP servers and use their tools
 * through the SnapBack MCP Client Manager.
 */

import { Guardian } from "./guardian.js";
import { MCPClientManager } from "./mcp-client.js";

async function example() {
	// Initialize the MCP client manager
	const mcpManager = new MCPClientManager();
	const guardian = new Guardian();

	try {
		// Connect to external MCP servers
		// Note: These would be real MCP servers in production
		console.log("Connecting to external MCP servers...");

		// Example: Connect to a documentation MCP server (like Context7)
		// await mcpManager.connectToServer('context7', 'context7-mcp')

		// Example: Connect to a code search MCP server
		// await mcpManager.connectToServer('code-search', 'code-search-mcp')

		// Example: Connect to a Git MCP server
		// await mcpManager.connectToServer('git', 'git-mcp')

		// List all available tools
		console.log("Available tools:");
		const allTools = mcpManager.listAllTools();
		for (const serverTools of allTools) {
			console.log(`  Server: ${serverTools.server}`);
			for (const tool of serverTools.tools) {
				console.log(`    - ${tool.name}: ${tool.description}`);
			}
		}

		// Example: Call a tool with resilience patterns
		console.log("Calling tools with resilience patterns...");

		// This would call a tool with circuit breaker, retry, and caching
		// const result = await mcpManager.callToolWithResilience(
		//   'context7',
		//   'search_docs',
		//   { query: 'how to use React hooks', language: 'typescript' },
		//   true, // use cache
		//   'docs-react-hooks' // cache key
		// )
		// console.log('Documentation search result:', result)

		// Example: Call a tool by name (auto-routed)
		// const searchResult = await mcpManager.callToolByName(
		//   'search_code',
		//   { query: 'useState hook implementation', filePattern: '*.tsx' }
		// )
		// console.log('Code search result:', searchResult)

		// Example: Integration with SnapBack's Guardian
		console.log("Integrating with SnapBack Guardian...");

		// Analyze some code changes
		const changes = [
			{
				added: true,
				removed: false,
				value: "const [count, setCount] = useState(0);",
				count: 1,
			},
		];

		const riskAnalysis = await guardian.analyze(changes);
		console.log("Risk analysis:", riskAnalysis);

		// If we had access to documentation, we could enhance the analysis
		// const docs = await mcpManager.callToolByName(
		//   'search_docs',
		//   { query: 'React useState best practices', language: 'javascript' },
		//   true, // use cache
		//   'docs-usestate-practices'
		// )
		// console.log('Documentation for useState:', docs)

		console.log("MCP Client example completed successfully!");
	} catch (error) {
		console.error("Error in MCP Client example:", error);
	} finally {
		// Clean up connections
		await mcpManager.disconnectAll();
	}
}

// Run the example if this file is executed directly
if (import.meta.url === new URL(process.argv[1], "file:").href) {
	example().catch(console.error);
}

export { example };
