# Web App Crawler & AI Agent Friendliness Analysis

**Date:** December 2, 2025
**Status:** ✅ AI-Friendly Configuration
**Last Analyzed:** apps/web at line-by-line audit

---

## Executive Summary

Your SnapBack marketing web app **is configured to be crawler and AI-agent friendly**. There are **NO blockers** preventing legitimate AI crawlers, search engines, or intelligent agents from accessing public content. The configuration actively encourages indexing and discoverability.

---

## Detailed Findings

### 1. ✅ Robots.txt Configuration

**Location:** `apps/web/app/robots.ts`

```typescript
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
	};
}
```

**Assessment:** ✅ **OPTIMAL**
- `userAgent: "*"` = Allows **ALL crawlers** (Google, Bing, Claude, GPT, Perplexity, etc.)
- `allow: "/"` = Permits crawling of the entire public site
- **No disallow rules** = No hidden content restrictions

**Impact:** Search engines and AI systems can freely index all public pages.

---

### 2. ✅ Sitemap Configuration

**Location:** `apps/web/app/sitemap.ts`

```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const posts = await getAllPosts();
	const legalPages = getAllLegalPages();

	return [
		...staticMarketingPages.flatMap((page) =>
			locales.map((locale) => ({
				url: new URL(`/${locale}${page}`, baseUrl).href,
				lastModified: new Date(),
			})),
		),
		...posts.map((post) => ({
			url: new URL(`/${post.locale}/blog/${post.path}`, baseUrl).href,
			lastModified: new Date(),
		})),
		...legalPages.map((page) => ({
			url: new URL(`/${page.locale}/legal/${page.path}`, baseUrl).href,
			lastModified: new Date(),
		})),
	];
}
```

**Assessment:** ✅ **EXCELLENT**
- Dynamically generates sitemap from posts and legal pages
- Includes all static marketing pages
- Updates lastModified timestamps (helps crawlers prioritize fresh content)
- No exclusions that would hide content from crawlers
- Accessible at `https://snapback.dev/sitemap.xml`

**Impact:** Crawlers can discover all indexable content efficiently without guessing URLs.

---

### 3. ✅ SEO Metadata Configuration

**Location:** `apps/web/app/layout.tsx`

```typescript
export const metadata: Metadata = {
	robots: {
		index: true,
		follow: true,
	},
	// ... OG metadata, alternates, etc.
};
```

**Assessment:** ✅ **CRAWLER-POSITIVE**
- `index: true` = Tell all crawlers this site should be indexed
- `follow: true` = Crawlers should follow internal links
- Canonical URLs defined = Prevents duplicate content issues
- OpenGraph metadata present = Better content understanding by AI systems
- Twitter Card metadata = Structured data for social crawlers

**Impact:** AI systems can understand page purpose and relationships without guessing.

---

### 4. ✅ Content Security Policy (NOT Blocking Crawlers)

**Location:** `apps/web/middleware.ts` and `apps/web/next.config.mjs`

```typescript
const scriptSrc = isDev
	? "'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://va.vercel-scripts.com https://www.googletagmanager.com https://us-assets.i.posthog.com"
	: "'self' 'unsafe-inline' https://challenges.cloudflare.com https://js.stripe.com https://va.vercel-scripts.com https://www.googletagmanager.com https://us-assets.i.posthog.com";

const cspDirectives = [
	"default-src 'self'",
	`script-src ${scriptSrc}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: https: blob:",
	"font-src 'self' data:",
	`connect-src ${connectSrc}`,
	// ... more directives
];
```

**Assessment:** ✅ **NOT A BLOCKER FOR CRAWLERS**
- CSP restricts JavaScript execution (security hardening, not crawler blocking)
- Allows all GET requests for static content (text, HTML, images, CSS, fonts)
- CSP applies to browser execution, NOT to crawler HTTP requests
- Crawlers that don't execute JavaScript (most search engines) are unaffected
- Browser-based crawlers (Playwright, Puppeteer, Claude's browsing) may have limitations with JS-heavy content, but text/HTML is fully accessible

**Key Point:** CSP is a **security measure**, not a crawler blocker. Crawlers fetch raw HTML/CSS/JS files and don't execute in a browser context.

---

### 5. ✅ Rate Limiting (Configured for Legitimate Use)

**Findings:** Rate limiting exists on the **API routes** (`apps/api/`), NOT on the marketing site.

**API Rate Limits** (does NOT apply to web app public pages):
- Free tier: 50 requests/hour (default)
- Solo tier: 500 requests/hour
- Team tier: 2,000 requests/hour
- Enterprise: Unlimited

**Assessment:** ✅ **REASONABLE AND APPROPRIATE**
- Rate limits are **plan-based**, not user-agent based
- Legitimate crawlers can request API keys for higher limits
- Public marketing pages have **NO rate limits**
- Prevents abuse while allowing normal use

**Impact:** AI systems and crawlers can access public content freely; API access requires authentication but is accommodating.

---

### 6. ✅ Security Headers (NOT Blocking Crawlers)

**Location:** `apps/web/next.config.mjs` and `apps/web/middleware.ts`

```typescript
{
	key: "X-Frame-Options",
	value: "DENY",
},
{
	key: "X-Content-Type-Options",
	value: "nosniff",
},
{
	key: "Referrer-Policy",
	value: "strict-origin-when-cross-origin",
},
```

**Assessment:** ✅ **NOT CRAWLER-BLOCKING**
- `X-Frame-Options: DENY` = Prevents framing in iframes (doesn't block crawlers)
- `X-Content-Type-Options: nosniff` = Forces correct MIME type interpretation (crawlers already respect this)
- `Referrer-Policy` = Controls referrer headers (normal crawler behavior)
- These are **security headers**, not access controls

**Impact:** Crawlers can access all content; these headers only restrict browser-specific attack vectors.

---

### 7. ✅ CORS Configuration (Open for Legitimate Requests)

**Location:** `apps/api/src/server.ts`

```typescript
cors({
	origin: (origin) => {
		const allowedOrigins = [
			"http://localhost:3000",
			"https://localhost:3000",
			"http://snapback.dev",
			"https://snapback.dev",
			"http://console.snapback.dev",
			"https://console.snapback.dev",
			// ... more domains
		];
	},
	allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
	allowMethods: ["POST", "GET", "OPTIONS"],
	exposeHeaders: ["Content-Length", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
})
```

**Assessment:** ✅ **APPROPRIATE FOR PUBLIC API**
- CORS allows cross-origin requests from legitimate domains
- GET requests allowed (read-only crawling)
- POST requests require Authorization (prevents abuse)
- API Key system available for automated access
- No blanket `*` allowing any origin (security best practice)

**Impact:** Crawlers can make authenticated requests with API keys; no cross-origin blocker.

---

### 8. ✅ Nginx Configuration (Well-Configured for Crawlers)

**Location:** `docker/nginx/nginx.conf`

```nginx
# Security.txt and robots.txt
location = /robots.txt {
	access_log off;
	log_not_found off;
	proxy_pass http://web_app;
}

location = /.well-known/security.txt {
	access_log off;
	proxy_pass http://web_app;
}

# Deny access to hidden files
location ~ /\. {
	deny all;
	access_log off;
	log_not_found off;
}
```

**Assessment:** ✅ **CRAWLER-FRIENDLY NGINX CONFIG**
- `robots.txt` is explicitly served (not hidden)
- `.well-known` directory is accessible (for standard discovery)
- Only hidden files (starting with `.`) are blocked (appropriate)
- No user-agent blocking rules
- Proxy to Next.js app allows all legitimate traffic

**Impact:** Nginx properly routes crawler requests to the Next.js app without blocking.

---

## 🚩 Potential Minor Issues (Very Low Priority)

### Issue 1: JavaScript-Heavy Content
Some content may be rendered client-side with React. Headless crawlers (Playwright, Puppeteer) can handle this, but traditional crawlers may see skeleton/loading states instead of final content.

**Solution:** If critical, ensure server-side rendering for blog posts and key marketing pages. Current setup is fine for most use cases.

### Issue 2: Dynamic Blog Posts
Blog posts are loaded dynamically in the sitemap. This is good, but ensure:
- [ ] All blog posts are actually in the sitemap
- [ ] `lastModified` timestamps are accurate

**Check:** Run crawler on `/sitemap.xml` to verify completeness.

### Issue 3: Console/App Routes May Be Restricted
The `/app/*` routes (console) likely require authentication. This is correct.

**Check:** Verify robots.txt excludes authenticated-only areas if desired:
```typescript
// Current: No exclusions (fine if /app requires auth)
// Could add: disallow: ["/app", "/api"]
```

---

## ✅ What's Working Well

| Aspect | Status | Reason |
|--------|--------|--------|
| **Robots.txt** | ✅ Optimal | Allows all crawlers, no restrictions |
| **Sitemap.xml** | ✅ Excellent | Dynamically generated with all content |
| **SEO Metadata** | ✅ Great | Full metadata for indexing |
| **CSP Headers** | ✅ Not Blocking | Only restricts browser JS execution |
| **Rate Limiting** | ✅ Reasonable | Plan-based, not user-agent based |
| **Security Headers** | ✅ Appropriate | Don't block crawlers |
| **CORS** | ✅ Open | Allows legitimate cross-origin requests |
| **Nginx Config** | ✅ Good | Routes crawlers properly |

---

## 🎯 Recommendations

### 1. Consider Explicit Sitemap References
Add a reference in robots.txt for extra clarity (optional):

```typescript
// apps/web/app/robots.ts
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: "https://snapback.dev/sitemap.xml", // Add this line
	};
}
```

### 2. Monitor Crawler Traffic
Add logging to track crawler access:
- Google Bot
- Bing Crawler
- OpenAI GPT Crawler
- Perplexity Bot
- Claude Crawler

### 3. Consider API Crawler Tier
If you want to support automated API access:
```typescript
// Create a "crawler" or "bot" tier with generous limits
const RATE_LIMITS: Record<Tier, ...> = {
	crawler: {
		default: { maxRequests: 1000, windowMs: 3600000 }, // 1000/hr for bots
	},
	// ...
};
```

### 4. Add Structured Data (Schema.org)
Enhance crawler understanding with JSON-LD:
```typescript
// apps/web/app/layout.tsx
const structuredData = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: "SnapBack",
	description: "Code protection for AI developers",
	// ...
};
```

### 5. Verify Blog Discoverability
Ensure blog posts have:
- [ ] Unique titles and descriptions
- [ ] Internal linking between related posts
- [ ] Canonical URLs
- [ ] Publication dates

---

## Summary

**Your web app is AI-crawler friendly!** 🎉

There are **zero blocking configurations** that would prevent:
- ✅ Google, Bing, DuckDuckGo from indexing
- ✅ OpenAI's GPT crawler from browsing
- ✅ Perplexity, Claude, or other AI systems from accessing content
- ✅ Research bots and legitimate crawlers from operating
- ✅ Scrapers with proper user-agents from accessing public data

The configuration is professional, security-conscious, and crawler-friendly. You can confidently share your site with AI systems and expect them to index and understand your content properly.

---

**Questions?** Review:
- robots.txt generation: `apps/web/app/robots.ts`
- Sitemap generation: `apps/web/app/sitemap.ts`
- Security headers: `apps/web/middleware.ts` and `apps/web/next.config.mjs`
- API rate limiting: `apps/api/middleware/rate-limit.ts`
