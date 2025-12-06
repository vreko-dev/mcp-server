/**
 * Post CI status to GitHub PR and console
 * Usage: npx tsx .github/scripts/post-status.ts <phase> <result>
 * Example: npx tsx .github/scripts/post-status.ts quality success
 */

interface LinearStatusMap {
	[key: string]: string;
}

/**
 * Extract Linear issue key from branch name or commit message
 * Examples: ENG-123-feature, Refs ENG-123
 */
function extractIssueKey(): string | null {
	// Check branch name
	const branchName = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "";
	const branchMatch = branchName.match(/([A-Z]+-\d+)/);
	if (branchMatch) return branchMatch[1];

	// Check PR title from context
	const prTitle = process.env.PR_TITLE || "";
	const titleMatch = prTitle.match(/([A-Z]+-\d+)/);
	if (titleMatch) return titleMatch[1];

	return null;
}

/**
 * Post CI phase results to console and optionally GitHub PR
 */
async function postCIStatus(phase: string, result: "success" | "failure") {
	const owner = process.env.GITHUB_REPOSITORY?.split("/")[0] || "unknown";
	const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] || "unknown";
	const commitSha = process.env.GITHUB_SHA || "unknown";
	const runId = process.env.GITHUB_RUN_ID || "unknown";
	const runUrl = `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${owner}/${repo}/actions/runs/${runId}`;

	const icon = result === "success" ? "✅" : "❌";
	const comment = `
${icon} **${phase}** phase ${result}

- Commit: \`${commitSha.slice(0, 7)}\`
- [View run](${runUrl})
  `.trim();

	console.log(comment);

	// If running in GitHub Actions, could post to PR
	if (process.env.GITHUB_TOKEN && process.env.PR_NUMBER) {
		console.log(`\n📝 Would post to PR #${process.env.PR_NUMBER}`);
	}
}

/**
 * Log Linear issue state mapping (stub for future integration)
 */
function logLinearStatus(phase: string, result: "success" | "failure") {
	const issueKey = extractIssueKey();

	if (!issueKey) {
		console.log("ℹ️  No Linear issue key found in branch/PR title");
		return;
	}

	console.log(`📋 Linear Issue: ${issueKey}`);
	console.log(`📊 Phase: ${phase}, Result: ${result}`);

	// State mapping for future Linear integration
	const stateMap: LinearStatusMap = {
		quality: result === "success" ? "In Progress" : "Needs Attention",
		build: result === "success" ? "In Progress" : "Needs Attention",
		test: result === "success" ? "In Review" : "Needs Attention",
		deploy: result === "success" ? "Done" : "Needs Attention",
	};

	const newState = stateMap[phase] || "In Progress";
	console.log(`→ Would update ${issueKey} to: ${newState}`);
	console.log("  (Requires LINEAR_API_KEY for actual integration)");
}

async function main() {
	const phase = process.argv[2] || "unknown";
	const result = (process.argv[3] || "success") as "success" | "failure";

	console.log(`📍 Posting status for phase: ${phase}\n`);

	await postCIStatus(phase, result);
	logLinearStatus(phase, result);
}

main().catch(console.error);
