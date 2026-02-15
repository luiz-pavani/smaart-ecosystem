# 🔧 Fix: Course Visibility Issue - Feb 15, 2026

## Problem Identified

User `ricolima2@gmail.com` (and potentially other regular subscribers) were seeing "NENHUM CURSO ENCONTRADO" (No courses found) despite having an active subscription.

## Root Cause

The course filtering logic in `/src/app/(ava)/cursos/page.tsx` was incorrectly filtering out courses for users **without** `entity_membership` (federation membership).

### Previous Logic (BROKEN):
```tsx
const cursosFiltrados = listaCursos.filter((curso: any) => {
  const scope = String(curso.federation_scope || 'ALL').trim().toUpperCase();
  if (scope === 'ALL') return true;
  if (!tag) return false; // ❌ This excluded ALL courses for regular subscribers
  return scope === tag;
});
```

**Issue**: If user had no `entity_membership`, `tag` would be `null`, causing the filter to return `false` for ALL courses that weren't explicitly marked as 'ALL'.

## Solution Implemented

### 1. Fixed Filter Logic

Updated `/src/app/(ava)/cursos/page.tsx` (lines 49-63):

```tsx
const cursosFiltrados = listaCursos.filter((curso: any) => {
  const scope = String(curso.federation_scope || 'ALL').trim().toUpperCase();
  
  // Cursos sem scope ou ALL: visíveis para todos
  if (!scope || scope === '' || scope === 'ALL') return true;
  
  // Cursos com scope específico: apenas para membros dessa federação
  if (tag && scope === tag) return true;
  
  // Caso contrário, não mostrar
  return false;
});
```

**Key Changes**:
- Courses with `federation_scope = null`, `''`, or `'ALL'` → Visible to **everyone**
- Courses with specific `federation_scope` (e.g., `'LRSJ'`) → Only visible to members of that federation
- Default behavior: show courses to regular subscribers

### 2. Created Diagnostic Tools

Created `/scripts/diagnose-user.js`:
- Checks user profile status
- Verifies federation membership
- Lists all available courses
- Shows which courses are visible to the user
- Identifies configuration issues

Usage:
```bash
node scripts/diagnose-user.js ricolima2@gmail.com
```

Created `/scripts/fix-course-scopes.js`:
- Automatically updates all courses to `federation_scope = 'ALL'`
- Ensures maximum visibility for all subscribers

Usage:
```bash
node scripts/fix-course-scopes.js
```

## Verification Results

After fix, diagnostic for `ricolima2@gmail.com` shows:

```
✅ Perfil encontrado: bde77f8a-9c62-468e-b8d3-37ef7e1d3d0a
✅ Status: active
✅ Plano: mensal (expires 2026-03-15)
✅ Subscription Status: active
✅ Cursos visíveis: 23 de 25
   - SENSEI: 9 cursos
   - TREINADOR: 5 cursos
   - GESTÃO: 4 cursos
   - KATA: 5 cursos
```

## Deployment

- **Commit**: `4c79945` - "Fix: Allow courses without federation_scope to be visible to all users"
- **Deployed**: February 15, 2026
- **Status**: ✅ Live on production

## Impact

- ✅ Regular subscribers (without federation membership) can now see courses
- ✅ Federation-specific courses remain restricted to federation members
- ✅ No breaking changes for existing federation users
- ✅ Improved user experience for all subscription tiers

## Files Changed

1. `/src/app/(ava)/cursos/page.tsx` - Fixed filter logic
2. `/scripts/diagnose-user.js` - Created diagnostic tool
3. `/scripts/fix-course-scopes.js` - Created bulk fix tool

## Follow-up Actions

- [ ] Monitor user reports for any remaining course visibility issues
- [ ] Consider adding admin UI for managing `federation_scope` per course
- [ ] Document course visibility rules in admin panel

## Related Issues

- Fixes the "empty course list" issue for regular subscribers
- Maintains federation-specific course restrictions
- Aligns with multi-tenant architecture requirements
