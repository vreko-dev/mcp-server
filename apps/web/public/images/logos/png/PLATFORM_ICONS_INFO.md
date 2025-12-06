# Platform-Specific Icons Archive

**Date Archived**: 2025-12-06
**Reason**: Web-only deployment - native platform icons not needed

## Contents

This directory contains icon assets exported for native platforms:
- **Android**: 7 sizes (36px - 512px)
- **iOS**: 21 sizes (16px - 1024px)
- **macOS**: 7 sizes (16px - 1024px)
- **Watch**: 9 sizes (24px - 108px)

## Usage History

These icons were likely generated for:
1. Native mobile app development (iOS/Android)
2. Desktop app development (macOS)
3. Wearable app development (Apple Watch)

## Web PWA Requirements

For web Progressive Web Apps, only 2 sizes are needed:
- ✅ `/public/icon-192.png` - Maskable icon
- ✅ `/public/icon-512.png` - Any purpose icon

Both are now located at the public root and referenced in [`app/manifest.ts`](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/web/app/manifest.ts).

## Restoration

If native platform development resumes, these icons can be restored from this archive.

## Source

Original icon source should be maintained as SVG at:
- `public/icons/source/snapback-icon.svg` (recommended location)

For regeneration, use automated tools like:
- **iOS**: Xcode Asset Catalog
- **Android**: Android Studio Asset Studio
- **macOS**: macOS iconutil
- **Web**: ImageMagick or Sharp (Node.js)
