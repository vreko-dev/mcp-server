# Policy Rule Precedence System

This document explains how SnapBack resolves conflicts between policy rules and determines which protection level to apply to files.

## Precedence Hierarchy

SnapBack follows a strict precedence hierarchy when evaluating policies:

1. **Overrides** (Highest precedence)
2. **Regular Rules** (Medium precedence)
3. **Default Settings** (Lowest precedence)

## Rule Precedence Resolution

Within the "Regular Rules" category, SnapBack uses the following algorithm to resolve conflicts:

### 1. Precedence Numbers

Each rule can optionally specify a `precedence` number (integer). Higher numbers indicate higher priority:

```json
{
  "rules": [
    {
      "pattern": "**/*.env",
      "level": "block",
      "reason": "Security-sensitive files",
      "precedence": 100
    },
    {
      "pattern": "**/*.ts",
      "level": "warn",
      "reason": "TypeScript files",
      "precedence": 50
    }
  ]
}
```

### 2. Conflict Resolution Algorithm

When multiple rules match the same file, SnapBack applies this resolution process:

1. **Sort by precedence**: Rules with higher precedence numbers are evaluated first
2. **Sort by position**: For rules with equal precedence, later rules in the array take priority
3. **Apply first matching rule**: The first rule that matches the file is applied

### 3. Default Behavior

If no precedence is specified, rules default to precedence `0`. This maintains backward compatibility with existing policy files.

## Examples

### Example 1: Basic Precedence

```json
{
  "rules": [
    {
      "pattern": "**/*.ts",
      "level": "warn",
      "precedence": 50
    },
    {
      "pattern": "**/config/*.ts",
      "level": "block",
      "precedence": 100
    }
  ]
}
```

In this example, a file at `src/config/app.ts` would be **blocked** because the config rule has higher precedence, even though the general TypeScript rule appears first.

### Example 2: Same Precedence Resolution

```json
{
  "rules": [
    {
      "pattern": "**/*.ts",
      "level": "warn",
      "precedence": 50
    },
    {
      "pattern": "**/src/*.ts",
      "level": "block",
      "precedence": 50
    }
  ]
}
```

In this example, a file at `src/utils.ts` would be **blocked** because the `**/src/*.ts` rule appears later in the array, giving it priority over the earlier rule.

### Example 3: Override Precedence

```json
{
  "rules": [
    {
      "pattern": "**/*.env",
      "level": "block",
      "precedence": 100
    }
  ],
  "overrides": [
    {
      "pattern": "**/*.env",
      "level": "warn",
      "rationale": "testing",
      "ttl": 1730428800000
    }
  ]
}
```

In this example, `.env` files would be **warned** instead of blocked because overrides always take precedence over regular rules, regardless of precedence numbers.

## Best Practices

1. **Use meaningful precedence numbers**: Use a consistent numbering scheme (e.g., 10, 50, 100) to make it easy to insert rules between existing priorities.

2. **Document your precedence strategy**: Include comments in your policy files explaining the reasoning behind precedence numbers.

3. **Test complex policies**: Use the SnapBack policy testing tools to verify that your precedence rules work as expected.

4. **Start with broad rules, then add specific ones**: Place general rules early in the array with lower precedence, then add specific exceptions with higher precedence.

## Migration from Previous Versions

Existing policy files without precedence numbers will continue to work as before, with rules resolved by their position in the array. To take advantage of the new precedence system, simply add `precedence` fields to your rules.