# Evolution Proposal: Pino logger migration pattern (console→pino signature difference) and Windows file casing pitfalls

- Proposal-ID: evo-2026-05-05-pino-windows-casing
- Status: approved
- Signature: pino-windows-casing
- Created-At: 2026-05-06 01:28
- Last-Seen-At: 2026-05-06 01:28
- Target-File: TOOLS.md
- Trigger-Type: preference
- Confidence: medium

## Why This Matters
- Pino logger migration pattern (console→pino signature difference) and Windows file casing pitfalls

## Evidence
- Interactive proposal card was present in the session UI.
- The original pending draft file was unavailable at approval time.
- AutoClaw reconstructed this draft from the proposal payload so the review result can still be recorded.

## Duplicate Check
- Checked: pending draft path + signature/proposal fallback
- Result: original draft file missing
- Decision: create surrogate draft from proposal payload

## Proposed Change
### Pino + Windows Casing Notes

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

## Apply Plan
1. Keep this reconstructed draft as the approval artifact.
2. Record the proposal content exactly as shown in the interactive card.
3. Append an audit note after approval or rejection.

## User Approval
- Approve: 批准 evo-2026-05-05-pino-windows-casing
- Reject: 拒绝 evo-2026-05-05-pino-windows-casing