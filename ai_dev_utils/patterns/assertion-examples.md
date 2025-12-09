# Assertion Examples - Good vs Bad

**Use this as a reference when writing tests.**

---

## Vague Assertions (FORBIDDEN)

### ❌ Bad: .toBeTruthy()
```typescript
// Problem: Too vague - could be true, "hello", 1, [], {}, etc.
expect(result).toBeTruthy();

// Fix: Assert specific value
expect(result).toEqual({ id: '123', name: 'test', active: true });
```

### ❌ Bad: .toBeDefined()
```typescript
// Problem: Only checks not undefined - could be null, false, "", 0, etc.
expect(result).toBeDefined();

// Fix: Assert specific value or structure
expect(result).toMatchObject({
  id: expect.any(String),
  count: expect.any(Number)
});
```

### ❌ Bad: .toBeGreaterThan(0)
```typescript
// Problem: Too loose - could be 0.001, 100, 1000000
expect(result.length).toBeGreaterThan(0);

// Fix: Assert exact length or structure
expect(result).toHaveLength(2);
expect(result[0]).toMatchObject({ id: 'item-1' });
```

### ❌ Bad: .not.toBeNull()
```typescript
// Problem: Only checks not null - could be undefined, false, "", 0, etc.
expect(result).not.toBeNull();

// Fix: Assert specific value
expect(result).toEqual({
  data: expect.arrayContaining([
    expect.objectContaining({ id: '123' })
  ])
});
```

---

## Specific Assertions (REQUIRED)

### ✅ Good: .toEqual()
```typescript
// Checks deep equality of objects/arrays
expect(result).toEqual({
  id: 'snapshot-123',
  status: 'created',
  files: ['file1.ts', 'file2.ts']
});
```

### ✅ Good: .toBe()
```typescript
// Checks exact reference equality for primitives
expect(result.count).toBe(42);
expect(result.isActive).toBe(true);
expect(result.name).toBe('John Doe');
```

### ✅ Good: .toMatchObject()
```typescript
// Partial object matching with type checkers
expect(result).toMatchObject({
  id: expect.any(String),
  timestamp: expect.any(Number),
  user: expect.objectContaining({
    name: 'Alice',
    email: expect.stringMatching(/@example\.com$/)
  })
});
```

### ✅ Good: .toHaveLength()
```typescript
// Specific array/string length
expect(result).toHaveLength(3);
expect(result[0]).toEqual({ id: '1', value: 'test' });
```

### ✅ Good: .toContain() / .toContainEqual()
```typescript
// Array contains specific value
expect(result).toContain('expected-item');

// Array contains object matching structure
expect(result).toContainEqual({ id: '123', name: 'test' });
```

---

## Pattern Matching

### Use expect.any() for Type Checking
```typescript
expect(result).toEqual({
  id: expect.any(String),
  count: expect.any(Number),
  timestamp: expect.any(Date),
  metadata: expect.any(Object)
});
```

### Use expect.stringMatching() for Regex
```typescript
expect(result.email).toEqual(expect.stringMatching(/^[^@]+@[^@]+\.[^@]+$/));
expect(result.id).toEqual(expect.stringMatching(/^snapshot-[0-9a-f]+$/));
```

### Use expect.arrayContaining() for Partial Arrays
```typescript
expect(result).toEqual(expect.arrayContaining([
  { id: '1', status: 'active' },
  { id: '2', status: 'inactive' }
]));
```

### Use expect.objectContaining() for Partial Objects
```typescript
expect(result).toEqual(expect.objectContaining({
  id: '123',
  // Don't care about other fields
}));
```

---

## Examples by Test Path

### Happy Path
```typescript
it('should return AI tool counts when valid user', async () => {
  const result = await aggregator.getAIToolCounts('user-123');
  
  // ✅ Specific assertion
  expect(result).toEqual([
    { tool: 'code completion', count: 42 },
    { tool: 'code review', count: 15 }
  ]);
});
```

### Sad Path
```typescript
it('should return empty array when user has no AI usage', async () => {
  const result = await aggregator.getAIToolCounts('new-user');
  
  // ✅ Specific assertion (empty array, not just "truthy")
  expect(result).toEqual([]);
  expect(result).toHaveLength(0);
});
```

### Edge Case
```typescript
it('should handle user at boundary (exactly 0 usage)', async () => {
  const result = await aggregator.getAIToolCounts('user-zero');
  
  // ✅ Specific assertion
  expect(result).toEqual([]);
});
```

### Error Path
```typescript
it('should throw error when database fails', async () => {
  vi.spyOn(db, 'select').mockRejectedValueOnce(new Error('Connection lost'));
  
  // ✅ Specific assertion (checks error message)
  await expect(aggregator.getAIToolCounts('user-123'))
    .rejects
    .toThrow('Connection lost');
});
```

---

## Quick Reference

| Vague (❌ FORBIDDEN) | Specific (✅ REQUIRED) |
|---------------------|------------------------|
| `.toBeTruthy()` | `.toEqual({ id: '123' })` |
| `.toBeDefined()` | `.toMatchObject({ ... })` |
| `.toBeGreaterThan(0)` | `.toHaveLength(2)` |
| `.not.toBeNull()` | `.toEqual([...])` |
| `.toBeFalsy()` | `.toBe(false)` or `.toBe(null)` |

---

**Last Updated:** 2025-12-09
