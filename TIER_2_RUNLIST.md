# Tier 2: Polish & Production Ready Runlist (52.25 hours)

Run this AFTER completing Tier 1 (59h) and shipping beta

## Sprint 4: Team Features & Documentation (13.75 hours)

### Quest 4.1: Team Sharing API Endpoints (6h)
**Priority:** BETA_ONLY
**Mode:** Execute with specs first

#### Context from Investigation
✅ **Database schema EXISTS:**
- `organizations` table with members/roles
- `orgMemberships` table (userId, organizationId, role)
- `apiKeys` table with permissions JSON

❌ **What's STUBBED:**
- 4 UI components have non-functional API calls
- API key CRUD endpoints don't exist
- Invitation error handling missing

#### Context Files (VERIFIED PATHS)
- apps/web/modules/saas/apikeys/components/CreateApiKeyDialog.tsx:29
- apps/web/modules/saas/apikeys/components/ApiKeyList.tsx:61
- apps/web/modules/saas/apikeys/components/CreateApiKeyModal.tsx:53
- apps/web/modules/saas/organizations/components/OrganizationInvitationModal.tsx:58
- packages/api/modules/apikeys/procedures/ (existing but incomplete procedures)

---

#### Task 4.1.1: API Key Creation Endpoint (2h)

**Create File:** `packages/api/modules/apikeys/procedures/create-api-key.ts`

**Current State Analysis:**
- Partial implementation exists but lacks organization-based permissions
- Missing proper tier checking and quota enforcement
- No proper error handling for organization membership verification

**Implementation Requirements:**
1. Verify user is admin of organization
2. Check organization tier allows API keys
3. Enforce API key limits based on plan
4. Generate secure API key with signing secret
5. Return key with proper metadata

**Implementation Details:**
- Use zod for input validation with name, organizationId, scopes, and expiresAt
- Implement PLAN_PERMISSIONS mapping for tier-based access control
- Use crypto.randomBytes for key generation
- Return key only once with proper security warnings

**Tests to Create:**
- Should create API key for admin users
- Should deny non-admin users
- Should enforce API key limits per plan tier

---

#### Task 4.1.2: API Key Revocation Endpoint (1.5h)

**Create File:** `packages/api/modules/apikeys/procedures/revoke-api-key.ts`

**Current State Analysis:**
- Basic implementation exists but lacks organization context verification
- Missing session invalidation for revoked keys
- No proper error handling for organization membership

**Implementation Requirements:**
1. Verify API key belongs to organization
2. Confirm user is admin of organization
3. Soft delete (set revokedAt timestamp)
4. Invalidate any active sessions using this key
5. Return proper success response with timestamp

**Implementation Details:**
- Use zod for input validation with apiKeyId
- Implement proper database queries with drizzle-orm
- Add invalidateApiKeySessions function
- Return success status with revoked timestamp

**Tests to Create:**
- Should revoke API key immediately
- Should invalidate sessions using revoked key
- Should prevent non-admin revocation

---

#### Task 4.1.3: List API Keys Endpoint (1h)

**Create File:** `packages/api/modules/apikeys/procedures/list-api-keys.ts`

**Current State Analysis:**
- Basic implementation exists but lacks organization context
- Missing proper filtering for active vs revoked keys
- No creator information or detailed metadata

**Implementation Requirements:**
1. Verify user is member of organization
2. List all API keys for organization
3. Filter out revoked keys
4. Include creator information
5. Return key previews (never full keys)

**Implementation Details:**
- Use zod for input validation with organizationId
- Implement proper database queries with drizzle-orm
- Use isNull(apiKeys.revokedAt) for filtering active keys
- Return keyPreview with format `${key.key.slice(0, 12)}...${key.key.slice(-4)}`
- Include createdBy user information

**Tests to Create:**
- Should list only active API keys for organization
- Should return key previews without full keys
- Should include creator information

---

#### Task 4.1.4: UI Wiring (1.5h)

**Files to Update:**
1. `apps/web/modules/saas/apikeys/components/CreateApiKeyDialog.tsx:29`
2. `apps/web/modules/saas/apikeys/components/ApiKeyList.tsx:61`
3. `apps/web/modules/saas/organizations/components/OrganizationInvitationModal.tsx:58`

**Current State Analysis:**
- CreateApiKeyDialog has TODO for actual API implementation
- ApiKeyList has TODO for revoke API call
- OrganizationInvitationModal has TODO for error handling

**Implementation Requirements:**

**Fix 1:** CreateApiKeyDialog.tsx:29
- Replace mock API call with actual ORPC call using api.apiKeys.create
- Handle loading states and errors with proper user feedback
- Show user-friendly success/error messages with toast notifications
- Implement form validation for key name

**Fix 2:** ApiKeyList.tsx:61
- Implement actual revoke API call using api.apiKeys.revoke
- Add confirmation dialog before revocation with descriptive warning
- Handle loading states and refresh list after successful revocation
- Show user-friendly success/error messages with toast notifications

**Fix 3:** OrganizationInvitationModal.tsx:58
- Add proper error handling for invitation acceptance/rejection
- Show user-friendly error messages for specific error codes (ALREADY_MEMBER, QUOTA_EXCEEDED)
- Handle loading states during API calls with visual feedback
- Implement proper success flow with toast notifications

**Validation:**
- API key creation works from dashboard with proper validation
- Revocation immediately invalidates keys with confirmation
- List shows key previews (never plaintext) with proper filtering
- Quota enforcement blocks over-limit creation with user notifications
- Error handling shows user-friendly messages for all scenarios
- All API calls have proper loading states and error boundaries

**Output:**
- 3 updated ORPC procedures (create, revoke, list)
- 3 updated UI components with proper API integration
- 6+ integration tests for complete functionality
- API key management documentation with security guidelines

---

### Quest 4.2: Fumadocs Integration (4h)
**Priority:** HIGH (docs site non-functional)
**Mode:** Execute with specs first

#### Context from Investigation
**Current State:** Documentation site non-functional due to empty content source
**Impact:** Users cannot access documentation

**Related Files:**
- apps/web/lib/source.ts (current docs source configuration)
- apps/web/app/docs/ (docs layout and pages)
- apps/web/modules/marketing/blog/components/PostContent.tsx (blog rendering)

---

#### Task 4.2.1: Fumadocs Source Configuration (1.5h)

**File to Update:** `apps/web/lib/source.ts`

**Current State Analysis:**
- Using fumadocs-mdx with proper configuration
- Content directory set to "app/(docs)"

**Implementation Requirements:**
- Verify content directory structure at ./content/docs/
- Ensure proper metadata generation from meta.json files
- Confirm search index building with buildSearchIndex: true
- Validate loader configuration with proper baseUrl and rootDir

**Implementation Details:**
- Create content/docs directory structure if missing
- Copy documentation content from apps/docs/content/docs/ if needed
- Verify lucide-react icon integration
- Test source.getPage, source.getPages, and source.pageTree functionality

---

#### Task 4.2.2: MDX Rendering for Blog (1h)

**File to Update:** `apps/web/modules/marketing/blog/components/PostContent.tsx:5`

**Current State Analysis:**
- Using basic HTML conversion instead of proper MDX rendering
- Missing syntax highlighting for code blocks
- No support for advanced MDX components

**Implementation Requirements:**
- Replace current HTML conversion with next-mdx-remote
- Add support for code syntax highlighting with rehype-pretty-code
- Implement custom components for callouts, links, images
- Add proper styling for all MDX elements with Tailwind classes

**Implementation Details:**
- Import MDXRemote from next-mdx-remote/rsc
- Create components object with pre, Callout, img, and a custom components
- Add syntax highlighting with shiki
- Implement responsive images with loading="lazy"
- Add external link handling with target="_blank" and rel attributes

**Dependencies to Install:**
- next-mdx-remote
- @next/mdx
- remark-gfm
- rehype-pretty-code
- shiki

---

#### Task 4.2.3: Docs Layout & Navigation (1h)

**Files to Verify:**
- apps/web/app/docs/layout.tsx
- apps/web/app/docs/[[...slug]]/page.tsx

**Current State Analysis:**
- Basic layout exists with navigation
- Page rendering implemented
- Sidebar configuration in place

**Implementation Requirements:**
- Verify proper routing for all doc pages with slug parameter
- Confirm sidebar navigation works correctly with pageTree
- Ensure metadata generation for SEO with generateMetadata function
- Test responsive design on mobile with proper breakpoints
- Implement DocsLayout with navigation title and external links

**Implementation Details:**
- Use DocsLayout from fumadocs-ui/layout
- Implement proper 404 handling with notFound()
- Add generateStaticParams for static generation
- Include table of contents with DocsPage and DocsBody
- Verify navigation links to Dashboard and GitHub

---

#### Task 4.2.4: Search Integration (30min)

**File to Create:** `apps/web/app/docs/search/route.ts`

**Current State Analysis:**
- Search functionality not implemented
- Layout has search configuration but no API endpoint

**Implementation Requirements:**
- Create search API endpoint using fumadocs-core
- Implement advanced search with indexing
- Wire to docs layout with RootProvider search configuration
- Test search functionality (Cmd+K) with proper keyboard shortcuts

**Implementation Details:**
- Import source from "@/lib/source"
- Use createSearchAPI from fumadocs-core/search/server
- Map page data to search indexes with title, description, url, and structuredData
- Configure RootProvider with search enabled and proper API endpoint
- Test search results with fuzzy matching and highlighting

**Validation:**
- Docs site loads with all pages and proper navigation
- Search functionality works (Cmd+K) with responsive results
- MDX renders with syntax highlighting for code blocks
- Blog posts render correctly with all MDX components
- Sidebar navigation works with proper hierarchy
- Responsive on mobile with touch-friendly navigation

**Output:**
- Configured docs-source.ts with proper content directory
- MDX rendering for blog with syntax highlighting and custom components
- Docs layout + navigation with table of contents
- Search API endpoint with advanced indexing
- Updated content directory structure with documentation files

---

### Quest 4.3: Analytics & Metrics Fixes (3h)
**Priority:** MEDIUM
**Mode:** Execute with specs first

#### Context from Investigation
**3 separate analytics fixes needed:**

1. `apps/web/lib/dashboard/metrics.ts:282` - Cloud storage returns hardcoded 0
2. `apps/web/modules/shared/components/ClientProviders.tsx:3` - Analytics module disabled
3. `apps/web/app/api/waitlist/task/route.ts:120` - PostHog event tracking missing

---

#### Task 4.3.1: Cloud Storage Calculation (1.5h)

**File to Update:** `apps/web/lib/dashboard/metrics.ts:282`

**Current State Analysis:**
- Cloud storage returns hardcoded 0
- TODO comment indicates need for actual calculation
- No integration with S3 or database for real values

**Implementation Requirements:**
- Implement database query for cloud storage calculation using drizzle-orm
- Add S3 direct query option for accuracy with AWS SDK
- Add caching for performance (5 minutes) with React cache
- Include proper error handling for AWS credentials and network issues
- Return cloud storage quota and percentage with usageLimits integration

**Implementation Details:**
- Import S3Client and ListObjectsV2Command from @aws-sdk/client-s3
- Implement getCloudStorageUsed function with database query option
- Implement getCloudStorageUsedFromS3 function with direct S3 query
- Add React cache with 5-minute expiration for expensive S3 queries
- Update getDashboardMetrics to use getCloudStorageUsed with proper error boundaries
- Include cloudStorageQuotaMb and cloudStoragePercent in return values

**Tests to Create:**
- Should calculate cloud storage from database with known snapshot sizes
- Should handle S3 query errors gracefully with fallback to database
- Should cache results appropriately with proper expiration
- Should return 0 for users with no cloud snapshots

---

#### Task 4.3.2: Re-enable Analytics Module (1h)

**File to Update:** `apps/web/modules/shared/components/ClientProviders.tsx:3`

**Current State Analysis:**
- AnalyticsScript is enabled but may have import issues
- PostHog initialization might be missing or incorrect

**Implementation Requirements:**
- Verify PostHog initialization in AnalyticsScript component
- Ensure proper environment variable handling with NEXT_PUBLIC_POSTHOG_KEY
- Confirm pageview tracking works with usePathname and useSearchParams
- Add error boundaries for analytics failures with try/catch
- Test in both development and production modes with proper debugging

**Implementation Details:**
- Check apps/web/modules/analytics/provider/posthog/index.tsx for proper client-side initialization
- Verify posthog.init configuration with api_host and loaded callback
- Confirm useEffect hook captures $pageview events with proper URL construction
- Implement analytics tracking functions for events, identify, and reset
- Add development mode debugging with posthog.debug()

**File to Check:** `apps/web/modules/analytics/provider/posthog/index.tsx`
- Verify proper "use client" directive
- Confirm event capture functionality with posthog.capture
- Add debugging for development mode with process.env.NODE_ENV check

---

#### Task 4.3.3: PostHog Waitlist Tracking (30min)

**File to Update:** `apps/web/app/api/waitlist/task/route.ts:120`

**Current State Analysis:**
- TODO comment for PostHog event tracking
- Task completion logic exists but no analytics

**Implementation Requirements:**
- Add PostHog server-side tracking with posthog-node
- Track waitlist_signup events with proper properties
- Include source, timestamp, and referrer information
- Ensure proper flushing before response with posthog.shutdown()
- Add error handling for analytics failures without affecting core functionality

**Implementation Details:**
- Import PostHog from posthog-node
- Initialize PostHog client with POSTHOG_API_KEY and POSTHOG_HOST
- Capture waitlist_signup event with distinctId as email
- Include properties: source, timestamp, and url from request headers
- Call await posthog.shutdown() before returning response
- Wrap analytics code in try/catch to prevent failures

**Validation:**
- Cloud storage shows actual S3 usage with proper fallback
- Analytics provider enabled with pageview tracking
- Pageviews tracked in PostHog with correct URLs
- Waitlist signups tracked with comprehensive event data
- Zero console errors in production with proper error boundaries

**Output:**
- Updated metrics calculation with S3 queries and database fallback
- Re-enabled AnalyticsProvider with proper PostHog integration
- PostHog waitlist tracking with server-side event capture
- 3 integration tests for analytics functionality

---

### Quest 4.4: Web App Polish (3.75h)

#### Task 4.4.1: Database Health Check (15min)

**File to Review:** `apps/web/app/api/health/route.ts`

**Current State Analysis:**
- Basic health check implementation exists
- Database connectivity check in place with drizzle
- Memory usage monitoring implemented

**Implementation Requirements:**
- Verify drizzle vs prisma comparison (currently using drizzle)
- Add disk space monitoring with fs module
- Improve error messages with more specific details
- Add more detailed diagnostics for non-production environments
- Include database query performance metrics

**Implementation Details:**
- Confirm drizzle is the correct ORM choice with db.execute(sql`SELECT 1`)
- Add disk space check with fs.statvfs or similar
- Enhance healthData response with specific error messages
- Add database query timing metrics
- Include additional system information in non-production environments

---

#### Task 4.4.2: Email Capture API (1h)

**Files to Create/Review:**
- New API endpoint for email capture at apps/web/app/api/email/capture/route.ts
- Integration with existing waitlist system

**Implementation Requirements:**
- Create POST endpoint for email capture with proper validation
- Validate email format with zod
- Store in database with source tracking
- Integrate with PostHog for analytics
- Add rate limiting protection
- Return proper success/error responses

**Implementation Details:**
- Create route.ts file with POST handler
- Use zod for email validation
- Import database schema and insert email with source
- Add PostHog tracking for email_capture event
- Implement rate limiting with middleware or library
- Return JSON responses with appropriate HTTP status codes
- Add proper error handling for database and validation errors

---

#### Task 4.4.3: ProductReferenceId Type Fix (1h)

**File to Update:** `apps/web/modules/saas/payments/hooks/plan-data.tsx`

**Current State Analysis:**
- TODO comment about fixing type definition
- Current type only includes: free, solo, team
- Missing other plan types like: pro, teams, enterprise, lifetime

**Implementation Requirements:**
- Update ProductReferenceId type to match all available plan types
- Verify config.payments.plans structure
- Update planData object to include all plan types
- Ensure proper typing throughout payment components
- Add missing plan descriptions and features

**Implementation Details:**
- Check config.payments.plans structure to identify all plan types
- Update ProductReferenceId type with keyof typeof config.payments.plans
- Add planData entries for pro, teams, enterprise, and lifetime plans
- Include appropriate titles, descriptions, and features for each plan
- Ensure all payment components use the updated type

---

#### Task 4.4.4: Extension Iteration Tracking (1.5h)

**File to Update:** `apps/vscode/src/extension.ts:294`

**Current State Analysis:**
- TODO comment for iteration tracking implementation
- Currently returning mock data
- Event handler exists but not implemented

**Implementation Requirements:**
- Implement actual iteration tracking in SaveHandler
- Track consecutive AI edits per file
- Calculate risk level based on edit patterns
- Determine coding velocity metrics
- Provide actionable recommendations
- Store data in extension storage
- Update get_iteration_stats handler to return real data

**Implementation Details:**
- Implement iteration tracking in the SaveHandler class
- Track consecutive AI edits with timestamp analysis
- Calculate risk levels based on frequency and magnitude of changes
- Determine velocity metrics with time-based analysis
- Store iteration data in extension storage with file paths as keys
- Update the get_iteration_stats event handler to return actual data
- Add proper error handling and data validation

---

#### Task 4.4.5: Consent Provider (15min)

**File to Update:** `apps/web/modules/shared/components/ConsentProvider.tsx`

**Current State Analysis:**
- TODO comment about installing js-cookie
- Currently using document.cookie directly
- Basic implementation works but could be improved

**Implementation Requirements:**
- Install js-cookie package with pnpm
- Replace document.cookie usage with js-cookie
- Add proper cookie expiration handling
- Ensure cross-browser compatibility
- Add tests for cookie management

**Implementation Details:**
- Run pnpm add js-cookie to install the package
- Import Cookies from "js-cookie"
- Replace document.cookie usage with Cookies.set()
- Add proper expiration with expires option
- Update allowCookies and declineCookies functions
- Add tests for cookie setting and retrieval

---

### Quest 4.5: MCP Guardian Decision (0.5h)

#### Task 4.5.1: Document API-first Architectural Decision (15min)

**Files to Update:**
- apps/mcp-server/CLAUDE.md
- apps/mcp-server/src/index.ts (implementation comments)

**Implementation Requirements:**
- Document decision to use API-first approach in CLAUDE.md
- Explain rationale for choosing remote Guardian over local
- Detail benefits: consistency, feature flags, circuit breaker
- Reference AnalysisRouter implementation
- Update implementation comments in index.ts

**Implementation Details:**
- Add section to CLAUDE.md explaining API-first decision
- Document tradeoffs between local Guardian Lite and remote API
- Include performance considerations and security implications
- Reference the AnalysisRouter.IMPLEMENTATION.ts file
- Update TODO comments in index.ts with decision rationale

---

#### Task 4.5.2: Update CLAUDE.md with Rationale (15min)

**File to Update:** `apps/mcp-server/CLAUDE.md`

**Implementation Requirements:**
- Add section on architectural decisions
- Document API-first vs local Guardian tradeoffs
- Include performance considerations
- Add security implications
- Reference future AnalysisRouter implementation

**Implementation Details:**
- Add "Architectural Decisions" section to CLAUDE.md
- Document rationale for API-first approach over local Guardian
- Include benefits like feature flags, circuit breaker, and consistency
- Add performance considerations with latency and resource usage
- Document security implications of remote vs local processing
- Reference AnalysisRouter implementation for future enhancement

---

### Quest 4.6: Full SDK Test Suite (35h)

#### Task 4.6.1: Privacy E2E Tests (8h)
**Tests:** 24 privacy E2E tests

**Implementation Requirements:**
- Create comprehensive privacy test suite covering all privacy features
- Test data encryption at rest with proper key management
- Verify secure communication channels with TLS validation
- Validate access control mechanisms with role-based permissions
- Test audit logging functionality with comprehensive event tracking
- Verify compliance with privacy regulations (GDPR, CCPA)
- Include edge case scenarios with malformed data and injection attempts
- Add performance benchmarks for privacy operations

**Implementation Details:**
- Create test files in apps/web/__tests__/privacy/
- Implement encryption tests with actual data encryption/decryption
- Add TLS validation tests for all API endpoints
- Create role-based access control tests with different user types
- Implement audit logging tests with event verification
- Add compliance tests for data handling and retention
- Include security tests for injection prevention
- Add performance benchmarks with timing assertions

---

#### Task 4.6.2: Error Handling Tests (6h)
**Tests:** 20 error handling tests

**Implementation Requirements:**
- Test graceful degradation scenarios with service failures
- Verify error message sanitization to prevent information leakage
- Test timeout handling with simulated network delays
- Validate retry mechanisms with exponential backoff
- Check circuit breaker functionality with failure thresholds
- Test resource cleanup on errors with proper disposal
- Verify logging of error conditions with appropriate detail
- Include network failure simulations with various error types

**Implementation Details:**
- Create test files in apps/web/__tests__/error-handling/
- Implement service failure tests with mocked dependencies
- Add error sanitization tests with PII validation
- Create timeout tests with jest.useFakeTimers()
- Implement retry mechanism tests with mock API calls
- Add circuit breaker tests with failure counting
- Include resource cleanup tests with proper teardown
- Add network failure tests with various HTTP error codes

---

#### Task 4.6.3: Privacy Integration Tests (6h)
**Tests:** 18 privacy integration tests

**Implementation Requirements:**
- Test integration between privacy components with end-to-end flows
- Verify end-to-end encryption flows with key exchange
- Test key management integration with secure storage
- Validate secure storage mechanisms with encryption at rest
- Check authentication integration with token validation
- Test authorization workflows with permission checking
- Verify audit trail completeness with event correlation
- Include multi-component failure scenarios with partial outages

**Implementation Details:**
- Create test files in apps/web/__tests__/privacy-integration/
- Implement end-to-end encryption tests with key generation and exchange
- Add key management tests with secure storage and retrieval
- Create secure storage tests with encryption validation
- Implement authentication tests with token generation and validation
- Add authorization tests with permission verification
- Include audit trail tests with event correlation
- Add multi-component failure tests with partial service outages

---

#### Task 4.6.4: Cache Tests (5h)
**Tests:** 15 cache tests

**Implementation Requirements:**
- Test cache hit/miss scenarios with proper data validation
- Verify cache invalidation logic with update operations
- Test cache expiration handling with time-based eviction
- Validate memory usage patterns with resource monitoring
- Check concurrent access handling with race conditions
- Test cache warming strategies with preloading
- Verify cache consistency with data synchronization
- Include performance benchmarks with timing measurements

**Implementation Details:**
- Create test files in apps/web/__tests__/cache/
- Implement cache hit/miss tests with data verification
- Add cache invalidation tests with update operations
- Create expiration tests with jest.useFakeTimers()
- Implement memory usage tests with process.memoryUsage()
- Add concurrent access tests with Promise.all()
- Include cache warming tests with preloading strategies
- Add consistency tests with data synchronization
- Include performance benchmarks with timing assertions

---

#### Task 4.6.5: Session Manager Tests (4h)
**Tests:** 5 session manager tests

**Implementation Requirements:**
- Test session creation and validation with proper token handling
- Verify session expiration handling with time-based invalidation
- Test concurrent session management with multiple sessions
- Validate session revocation with immediate invalidation
- Check session security measures with token validation

**Implementation Details:**
- Create test files in apps/web/__tests__/session-manager/
- Implement session creation tests with token generation
- Add session validation tests with token verification
- Create expiration tests with time-based invalidation
- Implement concurrent session tests with multiple users
- Add session revocation tests with immediate invalidation
- Include security tests with token validation

**Total Tier 2: 52.25 hours**

## Success Criteria Summary

### Team Sharing API
✅ API key creation works from dashboard with proper validation
✅ Revocation immediately invalidates keys with confirmation dialog
✅ List shows key previews (never plaintext) with proper filtering
✅ Quota enforcement blocks over-limit creation with user notifications
✅ Error handling shows user-friendly messages for all scenarios
✅ 6+ integration tests pass with comprehensive coverage

### Fumadocs Integration
✅ Docs site loads with all pages and proper navigation
✅ Search functionality works (Cmd+K) with responsive results
✅ MDX renders with syntax highlighting for code blocks
✅ Blog posts render correctly with all MDX components
✅ Sidebar navigation works with proper hierarchy
✅ Responsive on mobile with touch-friendly navigation

### Analytics & Metrics
✅ Cloud storage shows actual S3 usage with proper fallback to database
✅ Analytics provider enabled with pageview tracking
✅ Pageviews tracked in PostHog with correct URLs
✅ Waitlist signups tracked with comprehensive event data
✅ Zero console errors in production with proper error boundaries

### Web App Polish
✅ Database health check comprehensive with disk space monitoring
✅ Email capture API functional with validation and analytics
✅ ProductReferenceId type complete with all plan types
✅ Extension iteration tracking implemented with real data
✅ Consent provider properly configured with js-cookie

### MCP Guardian Decision
✅ API-first architectural decision documented with rationale
✅ CLAUDE.md updated with detailed tradeoffs and benefits

### Full SDK Test Suite
✅ All 24 privacy E2E tests passing with comprehensive coverage
✅ All 20 error handling tests passing with edge cases
✅ All 18 privacy integration tests passing with end-to-end flows
✅ All 15 cache tests passing with performance benchmarks
✅ All 5 session manager tests passing with security validation

## Deliverables

1. **3 new ORPC procedures** (create, revoke, list API keys) with comprehensive validation
2. **7 updated UI components** (API key management + organization invitation) with proper API integration
3. **6+ integration tests** for team sharing features with edge case coverage
4. **API key management documentation** with security guidelines and best practices
5. **Configured docs-source.ts** with proper content directory and search indexing
6. **MDX rendering for blog** with syntax highlighting and custom components
7. **Docs layout + navigation** with table of contents and responsive design
8. **Search API endpoint** for documentation with advanced indexing
9. **Updated content directory structure** with documentation files organized
10. **Updated metrics calculation** with S3 queries and database fallback
11. **Re-enabled AnalyticsProvider** with proper PostHog integration
12. **PostHog waitlist tracking** implementation with server-side event capture
13. **3 integration tests** for analytics functionality with error handling
14. **Email capture API** endpoint with validation and rate limiting
15. **Fixed ProductReferenceId** type definition with all plan types
16. **Implemented extension iteration tracking** with real data and storage
17. **Updated ConsentProvider** with js-cookie and proper expiration
18. **Documented API-first architectural decision** with detailed rationale
19. **Updated CLAUDE.md** with comprehensive tradeoffs and benefits
20. **Complete SDK test suite** (92 tests total) with performance benchmarks
