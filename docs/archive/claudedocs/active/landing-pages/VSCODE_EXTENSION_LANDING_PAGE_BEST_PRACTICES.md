# VSCode Extension Landing Page Best Practices

## Research-Based Recommendations for SnapBack

**Date**: 2025-10-03
**Focus**: Conversion-optimized patterns for developer-focused VSCode extensions

---

## 1. CTA Button Design & Placement

### Primary CTA: "Install Extension" Button

**Text Variations** (ordered by conversion effectiveness):

1. **"Install SnapBack for VS Code"** - Clear, specific, actionable
2. **"Add to VS Code"** - Simple, direct (GitHub Copilot pattern)
3. **"Get Extension"** - Concise alternative
4. **"Install Free Extension"** - Emphasizes free tier

**Visual Design**:

```tsx
// Recommended primary CTA styling
<Button className="group relative">
	<DownloadIcon className="mr-2 h-5 w-5" />
	Install SnapBack for VS Code
	<span className="ml-2 text-xs opacity-75">Free</span>
	<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
</Button>
```

**Color Strategy**:

-   Primary CTA: High-contrast gradient (purple/blue for tech tools)
-   VSCode brand colors: `#007ACC` (blue) can be incorporated
-   Use shimmer/glow effects for "premium" feeling without being overwhelming

### Secondary CTA Hierarchy

**Hero Section CTA Pairs**:

```tsx
// Primary: Extension install
<ShimmerButton href="vscode:extension/snapback.snapback-vscode">
  Install SnapBack for VS Code
</ShimmerButton>

// Secondary: Learn more
<Button variant="outline" href="#features">
  Watch Demo
</Button>

// Tertiary: Alternative install method
<Button variant="ghost" href="/docs/installation" className="text-sm">
  Manual Installation →
</Button>
```

---

## 2. Extension Install Flow UX

### One-Click Install Pattern

**Best Practice**: Deep link directly to VSCode marketplace

```tsx
// Option 1: VSCode protocol handler (instant install)
href = "vscode:extension/snapback.snapback-vscode";

// Option 2: Marketplace web URL (fallback)
href =
	"https://marketplace.visualstudio.com/items?itemName=snapback.snapback-vscode";

// Option 3: Smart detection
const getInstallUrl = () => {
	const isVSCode = navigator.userAgent.includes("VSCode");
	return isVSCode
		? "vscode:extension/snapback.snapback-vscode"
		: "https://marketplace.visualstudio.com/items?itemName=snapback.snapback-vscode";
};
```

### Installation Success Flow

**Post-Install Experience**:

```tsx
// Show immediate next steps after install
<InstallSuccessModal>
	<CheckCircle className="text-green-500" />
	<h3>SnapBack Installed Successfully!</h3>
	<ol>
		<li>Open VS Code</li>
		<li>Look for SnapBack icon in sidebar</li>
		<li>Create your first checkpoint (Cmd+Shift+S)</li>
	</ol>
	<Button href="/docs/quick-start">Quick Start Guide</Button>
</InstallSuccessModal>
```

---

## 3. Trust Signals for Developer Tools

### Marketplace Statistics Display

**What to Show** (in order of importance):

1. **Install count**: "10,000+ developers trust SnapBack"
2. **Star rating**: 4.8/5 stars (with review count)
3. **GitHub stars**: "2.3k stars on GitHub"
4. **Active users**: "Active in 50+ countries"
5. **Update frequency**: "Updated weekly"

**Visual Layout**:

```tsx
<div className="flex items-center gap-6 text-sm text-muted-foreground">
	<div className="flex items-center gap-2">
		<Download className="h-4 w-4" />
		<span className="font-semibold text-foreground">10k+</span>
		installs
	</div>
	<div className="flex items-center gap-2">
		<Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
		<span className="font-semibold text-foreground">4.8</span>
		(250 reviews)
	</div>
	<div className="flex items-center gap-2">
		<Github className="h-4 w-4" />
		<span className="font-semibold text-foreground">2.3k</span>
		stars
	</div>
</div>
```

### Open Source Trust Signals

**Badge Strategy**:

```tsx
// Hero section badges
<div className="flex flex-wrap gap-3 justify-center">
	<Badge variant="outline" className="gap-2">
		<Github className="h-4 w-4" />
		Open Source Core
	</Badge>
	<Badge variant="outline" className="gap-2">
		<Shield className="h-4 w-4" />
		MIT Licensed
	</Badge>
	<Badge variant="outline" className="gap-2">
		<Code className="h-4 w-4" />
		100% TypeScript
	</Badge>
	<Badge variant="outline" className="gap-2">
		<Lock className="h-4 w-4" />
		Local-First Privacy
	</Badge>
</div>
```

**"View Source" Prominence**:

```tsx
// Make GitHub repo link prominent
<Button variant="outline" href="https://github.com/snapback/snapback">
	<Github className="mr-2 h-5 w-5" />
	View Source on GitHub
	<ExternalLink className="ml-2 h-4 w-4" />
</Button>
```

---

## 4. VSCode Marketplace Integration

### Embedded Marketplace Info

**Recommendation**: Show live marketplace data

```tsx
// Fetch and display real marketplace stats
const MarketplaceStats = () => {
	const [stats, setStats] = useState(null);

	useEffect(() => {
		fetch("/api/marketplace-stats")
			.then((res) => res.json())
			.then(setStats);
	}, []);

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			<StatCard
				icon={<Download />}
				value={stats?.installs || "10k+"}
				label="Installs"
			/>
			<StatCard
				icon={<Star />}
				value={stats?.rating || "4.8"}
				label="Rating"
			/>
			<StatCard
				icon={<Users />}
				value={stats?.weeklyDownloads || "1.2k"}
				label="Weekly Downloads"
			/>
			<StatCard
				icon={<TrendingUp />}
				value={stats?.trend || "+15%"}
				label="Growth"
			/>
		</div>
	);
};
```

### Extension Screenshot Gallery

**Best Practice**: Show extension in action

```tsx
<div className="space-y-6">
	<h3>See SnapBack in Action</h3>
	<Tabs>
		<TabsList>
			<TabsTrigger value="checkpoint">Creating Checkpoints</TabsTrigger>
			<TabsTrigger value="recovery">One-Click Recovery</TabsTrigger>
			<TabsTrigger value="ai">AI Detection</TabsTrigger>
		</TabsList>
		<TabsContent value="checkpoint">
			<img
				src="/screenshots/checkpoint-flow.gif"
				alt="Creating a checkpoint in VS Code"
				className="rounded-lg border"
			/>
		</TabsContent>
	</Tabs>
</div>
```

---

## 5. API Key Presentation in Pricing

### Free vs Paid API Key Strategy

**Recommended Structure**:

```tsx
const PricingPlans = () => {
	return (
		<div className="grid md:grid-cols-3 gap-6">
			{/* Free Plan */}
			<PricingCard>
				<h3>Open Source</h3>
				<Price>$0</Price>
				<Features>
					<Feature icon={<Check />}>VS Code extension</Feature>
					<Feature icon={<Check />}>
						Local checkpoints (unlimited)
					</Feature>
					<Feature icon={<X className="text-muted" />}>
						No API key required
					</Feature>
					<Feature icon={<Info />}>Community support only</Feature>
				</Features>
				<Button>Install Extension</Button>
			</PricingCard>

			{/* Paid Plan */}
			<PricingCard highlighted>
				<Badge>Most Popular</Badge>
				<h3>Solo</h3>
				<Price>$29/mo</Price>
				<Features>
					<Feature icon={<Check />}>Everything in Free</Feature>
					<Feature icon={<Zap />} highlighted>
						Cloud backup with API key
					</Feature>
					<Feature icon={<Brain />} highlighted>
						Advanced AI detection (94%)
					</Feature>
					<Feature icon={<Headphones />}>Priority support</Feature>
				</Features>
				<Button variant="primary">Start 14-Day Trial</Button>
				<p className="text-xs text-muted-foreground mt-2">
					API key provided after signup
				</p>
			</PricingCard>
		</div>
	);
};
```

### API Key Setup Flow

**Post-Purchase Experience**:

```tsx
<OnboardingWizard>
	<Step number={1}>
		<h3>Welcome to SnapBack Solo!</h3>
		<APIKeyDisplay value="sb_live_abc123..." />
		<CopyButton />
	</Step>

	<Step number={2}>
		<h3>Add API Key to VS Code</h3>
		<CodeBlock language="json">
			{`// VS Code settings.json
{
  "snapback.apiKey": "sb_live_abc123...",
  "snapback.enableCloudBackup": true
}`}
		</CodeBlock>
	</Step>

	<Step number={3}>
		<h3>Test Your Connection</h3>
		<Button onClick={testConnection}>Test Cloud Backup</Button>
	</Step>
</OnboardingWizard>
```

---

## 6. Developer-Focused Conversion Patterns

### Command Palette Showcase

**Highlight VSCode Native Integration**:

```tsx
<FeatureShowcase>
	<h3>Works the Way You Work</h3>
	<div className="space-y-4">
		<CommandDemo>
			<Kbd>Cmd</Kbd> + <Kbd>Shift</Kbd> + <Kbd>P</Kbd>
			<span className="text-muted-foreground mx-2">→</span>
			<Code>SnapBack: Create Checkpoint</Code>
		</CommandDemo>

		<CommandDemo>
			<Kbd>Cmd</Kbd> + <Kbd>Shift</Kbd> + <Kbd>Z</Kbd>
			<span className="text-muted-foreground mx-2">→</span>
			<Code>Quick Recovery</Code>
		</CommandDemo>
	</div>
</FeatureShowcase>
```

### Terminal/CLI Integration

**Show CLI Tool** (appeals to terminal-first developers):

```tsx
<TerminalShowcase>
	<TerminalHeader>snapback-cli</TerminalHeader>
	<TerminalContent>
		<Line>$ npm install -g @snapback/cli</Line>
		<Line success>✓ SnapBack CLI installed</Line>
		<Line>&nbsp;</Line>
		<Line>$ snapback checkpoint --message "Before refactor"</Line>
		<Line success>✓ Checkpoint created: cp_abc123</Line>
		<Line>&nbsp;</Line>
		<Line>$ snapback list</Line>
		<Line output>
			3 checkpoints found: - cp_abc123 (2 min ago) Before refactor -
			cp_xyz789 (1 hour ago) Pre-deployment
		</Line>
	</TerminalContent>
</TerminalShowcase>
```

### Framework/Tool Compatibility

**Show Integrations**:

```tsx
<IntegrationGrid>
	<h3>Works with Your Stack</h3>
	<div className="grid grid-cols-3 md:grid-cols-6 gap-4">
		{[
			{ name: "React", logo: "/logos/react.svg" },
			{ name: "Next.js", logo: "/logos/nextjs.svg" },
			{ name: "Vue", logo: "/logos/vue.svg" },
			{ name: "TypeScript", logo: "/logos/typescript.svg" },
			{ name: "Node.js", logo: "/logos/nodejs.svg" },
			{ name: "Python", logo: "/logos/python.svg" },
		].map((tool) => (
			<ToolLogo key={tool.name} {...tool} />
		))}
	</div>
</IntegrationGrid>
```

---

## 7. Comparison to Competitors

### Positioning Against Git

**Address the Obvious Comparison**:

```tsx
<ComparisonSection>
  <h3>SnapBack vs Git</h3>
  <ComparisonTable>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Git</th>
        <th>SnapBack</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Speed</td>
        <td>Manual commits</td>
        <td className="highlighted">Automatic (< 1s)</td>
      </tr>
      <tr>
        <td>AI Detection</td>
        <td>No</td>
        <td className="highlighted">94% accuracy</td>
      </tr>
      <tr>
        <td>Learning Curve</td>
        <td>Steep</td>
        <td className="highlighted">Zero config</td>
      </tr>
      <tr>
        <td>Best For</td>
        <td>Version control</td>
        <td className="highlighted">Rapid experiments</td>
      </tr>
    </tbody>
  </ComparisonTable>
  <p className="text-sm text-muted-foreground mt-4">
    💡 Pro tip: Use SnapBack + Git together for ultimate safety
  </p>
</ComparisonSection>
```

---

## 8. Social Proof Patterns

### Developer Testimonials

**Format for Credibility**:

```tsx
<TestimonialCard>
	<Quote>
		"SnapBack saved me 4 hours after an AI coding session went wrong. One
		click recovery. Incredible."
	</Quote>
	<Author>
		<Avatar src="/avatars/dev1.jpg" />
		<div>
			<Name>Sarah Chen</Name>
			<Role>Senior Engineer @ Vercel</Role>
			<Social>
				<Github href="github.com/sarahchen" />
				<Twitter href="twitter.com/sarahchen" />
			</Social>
		</div>
	</Author>
</TestimonialCard>
```

### "Used By" Section

**Company Logos** (if applicable):

```tsx
<TrustedBy>
	<h3 className="text-sm text-muted-foreground uppercase tracking-wide">
		Trusted by developers at
	</h3>
	<LogoGrid>
		{/* Gray-scale logos with hover color effect */}
		<CompanyLogo src="/logos/companies/google.svg" alt="Google" />
		<CompanyLogo src="/logos/companies/microsoft.svg" alt="Microsoft" />
		{/* etc */}
	</LogoGrid>
</TrustedBy>
```

---

## 9. MCP Server Positioning

### Highlight Advanced Integration

**For Technical Audience**:

```tsx
<AdvancedFeature>
	<Badge variant="outline">
		<Cpu className="mr-2 h-4 w-4" />
		Model Context Protocol
	</Badge>
	<h3>MCP Server Integration</h3>
	<p>
		SnapBack includes a built-in MCP server for AI assistants like Claude
		Desktop, enabling intelligent checkpoint management directly from your
		AI workflow.
	</p>
	<CodeBlock language="json">
		{`// Claude Desktop config
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/mcp-server"]
    }
  }
}`}
	</CodeBlock>
	<Button variant="ghost" href="/docs/mcp">
		Learn about MCP →
	</Button>
</AdvancedFeature>
```

---

## 10. Pricing Page Optimization

### Free Tier Emphasis

**Recommended Structure**:

```tsx
<PricingHero>
	<h2>Start Free. Upgrade When Ready.</h2>
	<p className="text-xl text-muted-foreground">
		SnapBack core is 100% free and open source. Add cloud backup and AI
		features when you need them.
	</p>

	<div className="mt-8 flex gap-4 justify-center">
		<StatBadge>
			<Github className="h-5 w-5" />
			Open Source Core
		</StatBadge>
		<StatBadge>
			<Infinity className="h-5 w-5" />
			Unlimited Local Checkpoints
		</StatBadge>
		<StatBadge>
			<Zap className="h-5 w-5" />
			No Credit Card Required
		</StatBadge>
	</div>
</PricingHero>
```

### Upgrade Triggers

**When to Show Paid Features**:

```tsx
// In-app upgrade prompt (after user installs free version)
<UpgradePrompt trigger="cloud-backup-limit">
	<Icon>
		<Cloud className="h-6 w-6 text-blue-500" />
	</Icon>
	<Message>
		<h4>Your code deserves cloud backup</h4>
		<p>Protect your checkpoints across devices with SnapBack Solo</p>
	</Message>
	<Benefits>
		<Benefit>Automatic cloud sync</Benefit>
		<Benefit>Access from anywhere</Benefit>
		<Benefit>Priority recovery</Benefit>
	</Benefits>
	<CTA>
		<Button>Start 14-Day Trial</Button>
		<Link href="/pricing">Compare Plans →</Link>
	</CTA>
</UpgradePrompt>
```

---

## 11. SEO & Discoverability

### Marketplace Keywords

**Optimize for VSCode Search**:

-   Primary: "code protection", "undo", "backup", "ai safety"
-   Secondary: "checkpoint", "git alternative", "time machine"
-   Long-tail: "protect code from ai", "undo ai changes"

### Landing Page Meta

```tsx
<Head>
	<title>
		SnapBack - AI Code Protection for VS Code | Automatic Checkpoints
	</title>
	<meta
		name="description"
		content="Free VS Code extension with automatic checkpoints before AI changes. One-click recovery when things break. 10k+ developers protected."
	/>
	<meta property="og:image" content="/og-image-extension.png" />

	{/* VSCode marketplace rich snippets */}
	<script type="application/ld+json">
		{JSON.stringify({
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: "SnapBack",
			applicationCategory: "DeveloperApplication",
			operatingSystem: "VS Code",
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue: "4.8",
				ratingCount: "250",
			},
		})}
	</script>
</Head>
```

---

## 12. Mobile/Responsive Considerations

### Extension Pages Are Desktop-First

**But Still Optimize Mobile**:

```tsx
// Mobile: Focus on information, defer install to desktop
<MobileView>
  <h1>SnapBack for VS Code</h1>
  <p>Install on your desktop to get started</p>

  <CTAGroup>
    <Button onClick={sendInstallLink}>
      <Mail className="mr-2" />
      Email Me Install Link
    </Button>
    <Button variant="outline" href="#features">
      Learn More
    </Button>
  </CTAGroup>
</MobileView>

// Desktop: Direct install
<DesktopView>
  <Button href="vscode:extension/snapback.snapback-vscode">
    <Download className="mr-2" />
    Install for VS Code
  </Button>
</DesktopView>
```

---

## Implementation Checklist

### Phase 1: Hero Section (Week 1)

-   [ ] Add "Install SnapBack for VS Code" primary CTA
-   [ ] Implement VSCode deep link (`vscode:extension/...`)
-   [ ] Add extension stats (installs, rating, stars)
-   [ ] Add open source badges
-   [ ] Show VS Code integration screenshot

### Phase 2: Trust Signals (Week 2)

-   [ ] Add marketplace stats component
-   [ ] Embed GitHub star count
-   [ ] Add developer testimonials
-   [ ] Show "View Source" link prominently
-   [ ] Add framework compatibility grid

### Phase 3: Pricing Optimization (Week 3)

-   [ ] Emphasize free tier ("No API key required")
-   [ ] Clear paid tier benefits (cloud backup, AI)
-   [ ] Add API key setup wizard mockup
-   [ ] Show upgrade path visualization

### Phase 4: Advanced Features (Week 4)

-   [ ] MCP server documentation section
-   [ ] CLI tool showcase
-   [ ] Command palette demo
-   [ ] Git comparison table

---

## Success Metrics to Track

1. **Install Conversion Rate**: Landing page visit → Extension install
2. **Free-to-Paid Conversion**: Extension install → Solo plan signup
3. **Marketplace Rating**: Target 4.5+ stars
4. **GitHub Stars**: Growth rate week-over-week
5. **Documentation Engagement**: Time on docs, completion rate

---

## References & Inspirations

**Successful VSCode Extension Pages**:

-   GitHub Copilot: Clean, benefit-focused, clear CTA
-   Prettier: Simple, trust signals prominent
-   ESLint: Technical credibility, open source emphasis
-   GitLens: Feature-rich, clear free vs paid

**Developer Tool Landing Pages**:

-   Vercel: Minimal, fast, developer-first
-   Sentry: Problem-solution-CTA clarity
-   Supabase: Open source + managed service model
-   Linear: Polish, speed, developer experience

---

**Next Steps**: Implement Phase 1 hero section updates with VSCode-specific CTAs and trust signals.
