# SNAPBACK RISK REGISTER
*Generated: 2025-11-07*

## Risk Assessment Matrix

| Impact ↓ Likelihood → | Low (1) | Medium (2) | High (3) |
|------------------------|---------|------------|----------|
| **High (3)**          | Medium  | High       | Critical |
| **Medium (2)**        | Low     | Medium     | High     |
| **Low (1)**           | Low     | Low        | Medium   |

---

## Active Risks

### RISK-001: Session Replay Quota Exhaustion
**Status:** Active | **Score:** HIGH (Impact: 3, Likelihood: 2)

**Description:** Current 10% session sampling may exceed $5k monthly budget as user base grows.

**Indicators:**
- Current spend trajectory
- User growth rate
- Sampling rate vs insights value

**Mitigation:**
- Implement event-based triggering (errors only)
- Add cohort-based sampling
- Weekly budget monitoring alerts
- Automatic sampling reduction at 80% budget

**Contingency:**
- Emergency sampling rate reduction
- Temporary replay disable
- Negotiate volume pricing

**Owner:** Analytics Team | **Review:** Weekly

---

### RISK-002: Database Cascade Deletion Gaps
**Status:** Active | **Score:** MEDIUM (Impact: 3, Likelihood: 1)

**Description:** Missing FK CASCADE constraints could leave orphaned telemetry data, violating GDPR.

**Indicators:**
- Orphaned records in telemetry tables
- Failed deletion operations
- GDPR audit findings

**Mitigation:**
- Add CASCADE constraints to all FKs
- Implement deletion verification tests
- Monthly orphan record cleanup
- Document deletion flows

**Contingency:**
- Manual cleanup scripts
- Data retention policy enforcement
- Legal notification process

**Owner:** Backend Team | **Review:** Monthly

---

### RISK-003: Low Test Coverage Regression
**Status:** Active | **Score:** HIGH (Impact: 2, Likelihood: 2)

**Description:** MCP server at ~40% coverage risks undetected regressions.

**Indicators:**
- Coverage metrics trending
- Bug escape rate
- Production incident frequency

**Mitigation:**
- Mandate coverage for new code
- Dedicated test improvement sprint
- Coverage gates in CI (80% target)
- High-risk area prioritization

**Contingency:**
- Increased manual testing
- Canary deployments
- Quick rollback procedures

**Owner:** QA Team | **Review:** Weekly

---

### RISK-004: Feature Flag UI Flicker
**Status:** Monitoring | **Score:** LOW (Impact: 1, Likelihood: 2)

**Description:** Client-side feature flags may cause visible UI changes after load.

**Indicators:**
- User complaints
- CLS metrics degradation
- Support ticket patterns

**Mitigation:**
- Server-side flag bootstrapping
- Flag caching per session
- Critical flags in initial payload
- Progressive enhancement patterns

**Contingency:**
- Disable problematic flags
- Static flag compilation
- A/B test pause

**Owner:** Frontend Team | **Review:** Bi-weekly

---

### RISK-005: Documentation Drift
**Status:** Active | **Score:** MEDIUM (Impact: 2, Likelihood: 3)

**Description:** Rapid development causing documentation to become outdated.

**Indicators:**
- Doc update frequency
- Support question patterns
- Onboarding friction points

**Mitigation:**
- Doc updates in Definition of Done
- Automated API doc generation
- Quarterly doc audits
- Doc ownership assignment

**Contingency:**
- Documentation sprint
- Video tutorials as stopgap
- Increased support coverage

**Owner:** Docs Team | **Review:** Monthly

---

### RISK-006: Activation Funnel Gaps
**Status:** Mitigating | **Score:** HIGH (Impact: 3, Likelihood: 2)

**Description:** Incomplete funnel tracking preventing optimization of onboarding.

**Indicators:**
- Missing event coverage
- Unknown drop-off points
- Low activation rates

**Mitigation:**
- Complete implementation (Week 1)
- Daily funnel monitoring
- Session replay analysis
- A/B test interventions

**Contingency:**
- Manual cohort analysis
- User interviews
- Simplified onboarding path

**Owner:** Analytics Team | **Review:** Daily until resolved

---

### RISK-007: Performance Budget Violations
**Status:** Monitoring | **Score:** MEDIUM (Impact: 2, Likelihood: 2)

**Description:** Performance budgets defined but not enforced in CI/production.

**Indicators:**
- Budget violation frequency
- User-reported slowness
- Core Web Vitals trends

**Mitigation:**
- CI performance gates
- Production monitoring alerts
- Weekly performance reviews
- Optimization backlog

**Contingency:**
- Emergency performance sprint
- Feature rollback
- CDN optimization

**Owner:** DevOps Team | **Review:** Weekly

---

### RISK-008: MCP WebSocket Removal Impact
**Status:** Accepted | **Score:** LOW (Impact: 1, Likelihood: 1)

**Description:** WebSocket functionality removed for MVP may limit real-time features.

**Indicators:**
- User feature requests
- Competitive disadvantage
- Use case limitations

**Mitigation:**
- SSE as alternative
- Polling optimization
- Clear roadmap communication
- User expectation management

**Contingency:**
- Accelerated WebSocket reimplementation
- Third-party real-time service
- Partner integration

**Owner:** Backend Team | **Review:** Quarterly

---

## Risk Response Strategies

### Avoid
- Don't ship without minimum test coverage
- No production deployments on Fridays
- Avoid complex features before holidays

### Transfer
- Use managed services for complex infrastructure
- Leverage CDN for performance
- Insurance for data breach liability

### Mitigate
- Active monitoring and alerting
- Automated testing and validation
- Progressive rollouts with kill switches

### Accept
- Some technical debt for speed
- Limited browser support initially
- English-only documentation at launch

---

## Review Schedule

### Daily
- RISK-006: Activation Funnel (until resolved)

### Weekly
- RISK-001: Replay Quota
- RISK-003: Test Coverage
- RISK-007: Performance Budgets

### Bi-weekly
- RISK-004: Feature Flag Flicker

### Monthly
- RISK-002: Database Cascades
- RISK-005: Documentation Drift

### Quarterly
- RISK-008: WebSocket Removal
- Full risk register review

---

## Escalation Triggers

### Immediate Escalation
- Production data loss
- Security breach indication
- GDPR violation detected
- Revenue impact >$10k

### Next-Day Escalation
- Coverage drops below 30%
- Performance degradation >50%
- Activation rate drops >20%
- Support tickets spike >3x

### Weekly Review Escalation
- Risk score increases to Critical
- Mitigation plan failing
- New high-impact risk identified
- Resource constraints blocking mitigation