# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that is unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Pino Logger

**Signature difference from console**:
- ❌ `console.warn('msg:', error)` → ✅ `logger.warn({ err: error }, 'msg')`
- ❌ `console.error('msg:', status, body)` → ✅ `logger.error({ status, body }, 'msg')`
- ❌ `console.log('msg:', data)` → ✅ `logger.info({ data }, 'msg')` or `logger.info('msg')`
- Pino first arg is either a string OR a merge object; multiple positional args not supported
- Always wrap error objects in `{ err: error }` for proper stack trace serialization

## Windows File Casing

NTFS is case-insensitive but TypeScript is case-sensitive:
- `write` tool on Windows may create files with different casing than specified
- Always verify actual file name with `Get-ChildItem` after creation
- If tsc reports `Already included file name differs from... only in casing`:
  1. `Rename-Item` to correct casing (may need two renames if only case differs)
  2. Or delete and recreate with correct name
- Common victims: `logOperation.ts`→`logoperation.ts`, `Galaxy3D.vue`→`galaxy3d.vue`, `classRosters.ts`→`classrosters.ts`

---

Add whatever helps you do your job. This is your cheat sheet.
Do not store passwords, API keys, tokens, or secrets here in plain text.
For sensitive items, use aliases and safe context only.
