#!/usr/bin/env python3
"""
Fix $1 placeholders left by bad regex replacement

This script systematically fixes broken code patterns where "$1" appears
instead of properly expanded capture groups.
"""

import os
import re
from pathlib import Path

# Define fix patterns - order matters (most specific first)
FIXES = [
    # Function/method patterns
    (r'export default function (\w+)"\$1"', r'export default function \1()'),
    (r'export async function (\w+)"\$1"', r'export async function \1()'),
    (r'export function (\w+)"\$1"', r'export function \1()'),
    (r'async function (\w+)"\$1"', r'async function \1()'),
    (r'function (\w+)"\$1"', r'function \1()'),
    (r'(\w+)"\$1"\s*:\s*Promise<', r'\1('),  # async method signatures

    # Test patterns
    (r'\bit"\$1"\s*=>\s*\{', r'it("test", async () => {'),
    (r'\bdescribe"\$1"\s*=>\s*\{', r'describe("test", () => {'),

    # Database operations (Drizzle ORM)
    (r'\.select"\$1"', r'.select()'),
    (r'\.insert"\$1"', r'.insert'),
    (r'\.update"\$1"', r'.update'),
    (r'\.delete"\$1"', r'.delete'),
    (r'\.set"\$1"', r'.set({'),
    (r'\.where"\$1"', r'.where('),
    (r'\.findFirst"\$1"', r'.findFirst({'),
    (r'\.findMany"\$1"', r'.findMany({'),

    # expect() patterns - context dependent, use generic data
    (r'expect"\$1"\.toBe\(', r'expect(data).toBe('),
    (r'expect"\$1"\.toEqual\(', r'expect(data).toEqual('),
    (r'expect"\$1"\.toMatchObject"\$1"', r'expect(data).toMatchObject({'),
    (r'expect"\$1"\.toBeDefined\(\)', r'expect(data).toBeDefined()'),
    (r'expect"\$1"\.toBeNull\(\)', r'expect(data).toBeNull()'),
    (r'expect"\$1"\.toBeTruthy\(\)', r'expect(data).toBeTruthy()'),
    (r'expect"\$1"\.toBeFalsy\(\)', r'expect(data).toBeFalsy()'),
    (r'expect"\$1"\.toBeUndefined\(\)', r'expect(data).toBeUndefined()'),
    (r'expect"\$1"\.toHaveLength\(', r'expect(data).toHaveLength('),
    (r'expect"\$1"\.toHaveProperty\(', r'expect(data).toHaveProperty('),
    (r'expect"\$1"\.toContain\(', r'expect(data).toContain('),
    (r'expect"\$1"\.toMatch\(', r'expect(data).toMatch('),
    (r'expect"\$1"\.not\.toHaveProperty\(', r'expect(data).not.toHaveProperty('),
    (r'expect"\$1"\)\.toBeGreaterThan\(', r'expect(data).toBeGreaterThan('),
    (r'expect"\$1"\.getTime\(\)\)\.toBeGreaterThan\(', r'expect(new Date(data).getTime()).toBeGreaterThan('),

    # Specific method names
    (r'trackDeviceEvent"\$1"', r'trackDeviceEvent('),
    (r'trackUserEvent"\$1"', r'trackUserEvent('),
    (r'captureEvent"\$1"', r'capture({'),
    (r'getClientFingerprint"\$1"', r'getClientFingerprint()'),
    (r'createClient"\$1"', r'createClient()'),
    (r'updateCheckpointLimit"\$1"', r'updateCheckpointLimit('),
    (r'trackPayment"\$1"', r'trackPayment('),
    (r'sendPaymentReceipt"\$1"', r'sendPaymentReceipt('),
    (r'suspendAccount"\$1"', r'suspendAccount('),

    # Web API patterns
    (r'\.charCodeAt"\$1"', r'.charCodeAt(i)'),
    (r'\.padStart"\$1"', r'.padStart(2, \'0\')'),
    (r'\.digest"\$1"', r'.digest(\'SHA-256\', dataBuffer)'),
    (r'Intl\.DateTimeFormat"\$1"\.resolvedOptions\(\)\.timeZone', r'Intl.DateTimeFormat().resolvedOptions().timeZone'),
    (r'request\.headers\.get"\$1"', r'request.headers.get('),
    (r'request\.text"\$1"', r'request.text()'),
    (r'request\.json"\$1"', r'request.json()'),
    (r'response\.json"\$1"', r'response.json()'),
    (r'reset"\$1"', r'reset()'),

    # useEffect and React hooks
    (r'useEffect"\$1"', r'useEffect(() => {'),
    (r'useState"\$1"', r'useState('),
    (r'useCallback"\$1"', r'useCallback(() => {'),
    (r'useMemo"\$1"', r'useMemo(() => {'),
    (r'useRef"\$1"', r'useRef('),

    # Common method calls
    (r'\.map"\$1"', r'.map('),
    (r'\.filter"\$1"', r'.filter('),
    (r'\.reduce"\$1"', r'.reduce('),
    (r'\.forEach"\$1"', r'.forEach('),
    (r'\.find"\$1"', r'.find('),
    (r'\.some"\$1"', r'.some('),
    (r'\.every"\$1"', r'.every('),

    # Type assertions and generics
    (r'<\w+>"\$1"', r'<T>()'),
]

def fix_file(file_path):
    """Fix $1 instances in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Skip if no $1 found
        if '$1' not in content:
            return False

        original = content

        # Apply all fixes
        for pattern, replacement in FIXES:
            content = re.sub(pattern, replacement, content)

        # Write back if changed
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main execution"""
    base_dir = Path(__file__).parent.parent / 'apps' / 'web'

    # Find all TS/TSX files
    files = list(base_dir.rglob('*.ts')) + list(base_dir.rglob('*.tsx'))

    # Filter out node_modules and .next
    files = [f for f in files if 'node_modules' not in str(f) and '.next' not in str(f)]

    # Find files with $1
    affected_files = []
    for file in files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                if '$1' in f.read():
                    affected_files.append(file)
        except:
            pass

    print(f"Found {len(affected_files)} files with $1 issues")

    # Fix each file
    fixed_count = 0
    for file in affected_files:
        if fix_file(file):
            fixed_count += 1
            rel_path = file.relative_to(base_dir.parent.parent)
            print(f"✓ Fixed: {rel_path}")

    print(f"\nFixed {fixed_count} files")

    # Check remaining issues
    remaining = []
    for file in files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for i, line in enumerate(lines, 1):
                    if '$1' in line:
                        remaining.append((file, i, line.strip()))
        except:
            pass

    if remaining:
        print(f"\n⚠️  {len(remaining)} instances of $1 still remain")
        for file, line_no, line in remaining[:20]:
            rel_path = file.relative_to(base_dir.parent.parent)
            print(f"  {rel_path}:{line_no} - {line[:80]}")
        if len(remaining) > 20:
            print(f"  ... and {len(remaining) - 20} more")
    else:
        print("\n✅ All $1 instances have been fixed!")

if __name__ == '__main__':
    main()
