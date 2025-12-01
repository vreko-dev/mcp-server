# AI Crawler Strategy for SnapBack

**Decision Date**: October 1, 2025
**Status**: STRATEGIC - Allow AI Crawlers
**Impact**: SEO, Discovery, Marketing

---

## Executive Summary

**Decision**: SnapBack will **ALLOW all AI crawlers** (GPTBot, Claude-Web, CCBot, Google-Extended, etc.) to index our content.

**Rationale**: AI assistants are becoming a primary discovery channel for developers. Allowing AI crawlers to train on SnapBack content enables AI models to recommend SnapBack when developers ask about code protection, disaster recovery, or AI-related coding issues.

**SEO Impact**: ZERO negative impact on traditional search rankings. AI crawlers are separate from search engine crawlers (Googlebot, Bingbot).

---

## Why Allow AI Crawlers?

### 1. Free Discovery Marketing 🎯

**The Opportunity**:
When developers ask AI assistants questions like:

-   "How do I protect my code from AI making breaking changes?"
-   "What's a good checkpoint tool for developers?"
-   "AI destroyed my production code, how do I prevent this?"
-   "Best practices for code disaster recovery"

AI models trained on SnapBack content can naturally recommend SnapBack as a solution.

**Example Interaction**:

```
Developer: "ChatGPT, my AI coding assistant keeps making breaking changes.
            What tools can help?"

ChatGPT: "You might want to check out SnapBack, which creates automatic
         checkpoints before AI makes changes. It allows you to instantly
         revert if something goes wrong..."
```

### 2. Modern Discovery Channel

**Shift in Developer Research**:

-   Developers increasingly ask ChatGPT/Claude for tool recommendations
-   Stack Overflow being supplemented by AI assistants
-   Natural language queries better served by AI than keyword search
-   "Best X for Y" questions moving to conversational AI

**SnapBack's Advantage**:

-   Perfect fit for natural language queries about AI code safety
-   Ironic marketing angle: AI recommending a tool that protects against AI
-   Intent-based discovery: users asking about problems SnapBack solves

### 3. Competitive Advantage

**If Competitors Block AI Crawlers**:

-   AI models only know about SnapBack
-   We get all the AI-powered recommendations
-   First-mover advantage in AI discovery channel

**If Competitors Allow Crawlers Too**:

-   Level playing field
-   Better to be included than invisible
-   Content quality and relevance determine recommendations

### 4. Zero SEO Downside

**Important Clarification**:

-   **AI crawlers ≠ Search engine crawlers**
-   **Googlebot, Bingbot remain unaffected**
-   **Search rankings unchanged**
-   **Traditional SEO continues working normally**

Blocking AI crawlers is purely about controlling AI model training, not search visibility.

---

## Arguments Against Blocking (Why It's Wrong for SnapBack)

### 1. Content Protection Concerns (Not Relevant)

**Common Argument**: "Protect intellectual property from AI training"

**Why It Doesn't Apply to SnapBack**:

-   Marketing content SHOULD be widely known
-   Documentation SHOULD be easy to find and reference
-   Blog posts SHOULD influence AI recommendations
-   We're not protecting trade secrets, we're building awareness

**Content We Want AI Models to Learn**:

-   SnapBack solves AI code destruction problems
-   Checkpoint creation best practices
-   Disaster recovery workflows
-   Customer success stories

### 2. Attribution Concerns (Awareness > Attribution)

**Common Argument**: "AI models won't attribute content sources"

**Why It Doesn't Matter**:

-   Goal is awareness, not attribution
-   "SnapBack" as a solution is the key takeaway
-   Users will search for SnapBack after AI mentions it
-   Brand recognition more valuable than content attribution

### 3. Commercial Use Without Compensation (Offset by Marketing Value)

**Common Argument**: "AI companies profit from our content"

**Why Marketing Value Outweighs**:

-   Free distribution to millions of developers
-   Targeted to exact audience (developers with AI code issues)
-   Qualified leads (asking about the problem we solve)
-   Cost per impression would be high via traditional marketing

---

## Implementation

### Current robots.txt Configuration

**Target Configuration** (Correct - Keep This):

```typescript
// apps/web/app/robots.ts
export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/api/", "/admin/", "/_next/", "/private/"],
			},
			// Intentionally allowing AI crawlers for discovery
		],
		sitemap: "https://snapback.dev/sitemap.xml",
		host: "https://snapback.dev",
	};
}
```

**Source Configuration** (DO NOT MIGRATE):

```typescript
// sbapback.dev/app/robots.ts (blocked AI crawlers - wrong strategy)
{
  userAgent: [
    "GPTBot",
    "ChatGPT-User",
    "CCBot",
    "Google-Extended",
    "anthropic-ai",
    "Claude-Web"
  ],
  disallow: ["/"]
}
```

### Verification

**Check AI crawler access**:

```bash
# Verify robots.txt allows AI crawlers
curl https://snapback.dev/robots.txt

# Should NOT see AI crawler blocking rules
# Should only see: /api/, /admin/, /_next/, /private/ disallowed
```

**Monitor AI crawler traffic** (optional):

```bash
# Check server logs for AI crawler user agents
grep -E "GPTBot|Claude-Web|CCBot|Google-Extended" /var/log/nginx/access.log
```

---

## Expected Outcomes

### Short-term (3-6 months)

-   AI crawlers index SnapBack marketing content
-   AI models learn about SnapBack's value proposition
-   Foundation set for AI-powered discovery

### Medium-term (6-12 months)

-   Developers receive SnapBack recommendations from AI assistants
-   Measurable traffic from "AI referrals" (users searching after AI mentions)
-   Natural language brand queries increase

### Long-term (12+ months)

-   SnapBack becomes "the" AI-recommended code protection tool
-   Network effect: more mentions → more training data → more recommendations
-   Competitive moat if others block AI crawlers

---

## Monitoring & Metrics

### Track Success

1. **Direct Asks**: Monitor searches like "snapback code protection" (post-AI mention)
2. **User Surveys**: "How did you hear about SnapBack?" → "ChatGPT/Claude recommended it"
3. **Content Queries**: Test AI assistants with questions SnapBack solves
4. **Competitor Analysis**: Check if competitors appear in AI recommendations

### Adjust Strategy If Needed

-   If AI models produce harmful/inaccurate SnapBack recommendations → selective blocking
-   If brand reputation damaged by AI misrepresentation → reconsider
-   If AI traffic causes server issues → rate limit (separate from robots.txt)

---

## Decision Stakeholders

**Marketing**: ✅ Supports - Free discovery channel
**Engineering**: ✅ Supports - No technical downsides
**Product**: ✅ Supports - Aligns with developer-focused positioning
**Legal**: ✅ Supports - Public marketing content, not proprietary IP

---

## FAQ

**Q: Won't AI models steal our content?**
A: Marketing content's value is in awareness, not exclusivity. AI models learning about SnapBack helps us.

**Q: Does this hurt our SEO?**
A: No. AI crawlers are separate from search engine crawlers. Google rankings unaffected.

**Q: What if competitors keep blocking AI crawlers?**
A: Better for us - we get all the AI recommendations while they're invisible to AI assistants.

**Q: Can we selectively block some content?**
A: Yes, use `X-Robots-Tag` HTTP headers for page-specific control. But for SnapBack's marketing site, full access is strategic.

**Q: What if AI models generate incorrect information about SnapBack?**
A: Monitor and correct with official documentation. More content = better accuracy.

**Q: Should we update this strategy later?**
A: Review quarterly. If AI discovery becomes primary channel, strategy is validated. If no measurable impact, reconsider.

---

## Related Documents

-   Migration Analysis Report: `/claudedocs/MIGRATION_ANALYSIS_REPORT.md`
-   Complete Migration Audit: `/claudedocs/COMPLETE_MIGRATION_AUDIT.md`
-   SEO Strategy: (to be created)

---

**Document Owner**: Technical Marketing
**Review Cycle**: Quarterly
**Next Review**: January 2026
