/**
 * Risk Analysis Example
 *
 * This example demonstrates how to use SnapBack SDK to analyze
 * security risks in code changes before applying them.
 */

import { RiskAnalyzer, THRESHOLDS, updateThresholds } from "@snapback/sdk";
import { describeRiskFactors } from "@snapback/sdk";

// Configure SDK for strict security
updateThresholds({
	risk: {
		blockingThreshold: 7.0, // Critical threshold
		criticalThreshold: 7.0,
		highThreshold: 5.0,
		mediumThreshold: 3.0,
	},
});

async function analyzeGitChanges() {
	const analyzer = new RiskAnalyzer();

	// Simulate git changes
	// Changes object is used to demonstrate the structure (not directly used in analyze)

	console.log("🔍 Analyzing git changes for security risks...\n");

	// Analyze risk - analyze code content from modified files
	const codeContent = `
    // Potentially risky code patterns
    const userInput = req.query.search;
    const query = "SELECT * FROM users WHERE id = " + userInput; // SQL injection risk
    eval(userInput); // eval() is dangerous
    document.innerHTML = userInput; // XSS risk
  `;

	const riskResult = analyzer.analyze(codeContent, "database.ts");

	// Display results
	console.log("📊 Risk Analysis Results:");
	console.log(`   Score: ${riskResult.score.toFixed(1)}/10`);
	console.log(`   Severity: ${riskResult.severity.toUpperCase()}`);
	console.log(`   Blocking threshold: ${THRESHOLDS.risk.blockingThreshold}`);

	if (riskResult.factors && riskResult.factors.length > 0) {
		console.log("\n⚠️  Risk Factors Detected:");
		riskResult.factors.forEach((factor, i) => {
			console.log(`   ${i + 1}. ${factor.message} (Line ${factor.line})`);
		});
	}

	// Determine action based on risk level
	console.log("\n📋 Recommendation:");

	if (riskResult.score >= THRESHOLDS.risk.blockingThreshold) {
		console.log(`   🚫 BLOCKED - Risk too high (${riskResult.score}/10)`);
		console.log("   Action: Review and address risk factors before proceeding");
		return false;
	}

	if (riskResult.score >= THRESHOLDS.risk.highThreshold) {
		console.log(`   ⚠️  WARNING - High risk detected (${riskResult.score}/10)`);
		console.log("   Action: Requires approval from security reviewer");
		return "requires-review";
	}

	if (riskResult.score >= THRESHOLDS.risk.mediumThreshold) {
		console.log(`   ℹ️  NOTICE - Moderate risk (${riskResult.score}/10)`);
		console.log("   Action: Standard review process recommended");
		return "standard-review";
	}

	console.log(`   ✅ SAFE - Low risk (${riskResult.score}/10)`);
	console.log("   Action: Auto-approved for merging");
	return true;
}

/**
 * SDK Example: Using the canonical risk factor description utility
 *
 * The @snapback/sdk provides centralized risk factor descriptions that ensure
 * consistent communication across all SnapBack platforms (VSCode, CLI, Web, API).
 *
 * Example usage:
 * ```typescript
 * const rawFactors = ["eval execution", "sql injection"];
 * const descriptions = describeRiskFactors(rawFactors);
 * // Returns: ["Dynamic code execution detected...", "SQL injection vulnerability..."]
 * ```
 */
function demonstrateRiskFactorDescriptions(): void {
	const exampleFactors = ["eval execution", "sql injection", "unknown factor"];

	// Use the SDK's canonical risk factor descriptions
	const descriptions = describeRiskFactors(exampleFactors);

	console.log("\n🔐 Risk Factor Descriptions (from SDK):");
	exampleFactors.forEach((factor, i) => {
		console.log(`  ${factor}: ${descriptions[i]}`);
	});
}

// Example with multiple risk levels
async function demonstrateRiskLevels() {
	console.log("📈 Demonstrating Different Risk Levels\n");

	const scenarios = [
		{
			name: "Low Risk - Documentation Update",
			code: "# README.md - Updated documentation",
		},
		{
			name: "Medium Risk - Feature Addition",
			code: `function newFeature() {
        const data = getUserData();
        return processData(data);
      }`,
		},
		{
			name: "High Risk - Auth Logic Change",
			code: `function authenticate(user, password) {
        const hash = crypto.createHash('md5').update(password).digest();
        return hash === user.passwordHash;
      }`,
		},
		{
			name: "Critical Risk - Dangerous Pattern",
			code: `function executeCode(code) {
        eval(code);
        const query = "SELECT * FROM users WHERE id=" + userId;
        db.execute(query);
      }`,
		},
	];

	const analyzer = new RiskAnalyzer();

	for (const scenario of scenarios) {
		console.log(`\n📝 Scenario: ${scenario.name}`);

		const result = analyzer.analyze(scenario.code, `example-${scenario.name}.ts`);

		const indicator =
			result.score >= THRESHOLDS.risk.blockingThreshold
				? "🚫"
				: result.score >= THRESHOLDS.risk.highThreshold
					? "⚠️"
					: result.score >= THRESHOLDS.risk.mediumThreshold
						? "ℹ️"
						: "✅";

		console.log(`   ${indicator} Risk: ${result.score.toFixed(1)}/10 (${result.severity})`);
		if (result.factors.length > 0) {
			result.factors.slice(0, 2).forEach((f) => {
				console.log(`      - ${f.message}`);
			});
		}
	}
}

// Run examples
async function main() {
	console.log(`${"=".repeat(60)}`);
	console.log("SnapBack SDK - Risk Analysis Example");
	console.log(`${"=".repeat(60)}\n`);

	// Run first example
	await analyzeGitChanges();

	console.log(`\n${"=".repeat(60)}\n`);

	// Demonstrate canonical SDK risk factor descriptions
	demonstrateRiskFactorDescriptions();

	console.log(`\n${"=".repeat(60)}\n`);

	// Run risk level demonstration
	await demonstrateRiskLevels();

	console.log(`\n${"=".repeat(60)}`);
	console.log("✅ Example Complete");
	console.log(`${"=".repeat(60)}`);
}

main().catch(console.error);
