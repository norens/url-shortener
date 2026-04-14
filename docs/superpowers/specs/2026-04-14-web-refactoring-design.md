# Web Frontend Refactoring Design

## Context

The frontend (`apps/web/`) works but has structural issues: large page components with
inline business logic, duplicated patterns (copy-to-clipboard 3x, auth forms 70% identical),
no custom hooks, and SWR calls scattered directly in pages. Analytics components are already
clean presentational components — no changes needed there.

**Scope:** Structure + improvements. Same approach as API refactoring.

---

## 1. Custom Hooks (`src/hooks/`)

### `useCopyToClipboard.ts`
Duplicated in: page.tsx, links/page.tsx, [code]/page.tsx.
- `copyToClipboard(text: string)` — writes to clipboard, sets `copied` for 2s
- Returns `{ copied: string | null, copyToClipboard }`

### `useApiSWR.ts`
Wraps SWR with apiGet for typed, DRY data fetching.
- `useApiSWR<T>(path: string | null)` — returns SWR result typed as T
- Replaces: `useSWR(url, (url) => apiGet<T>(url))`

### `useCreateLink.ts`
Extracted from CreateLinkDialog.tsx (7 useState → 1 hook).
- Manages: url, alias, title, expiresAt, error, loading, open
- `submit()`, `reset()`, `setField(name, value)`
- Takes `onSuccess` callback + SWR mutate

### `useEditLink.ts`
Extracted from EditLinkForm.tsx (4 useState → 1 hook).
- Manages: url, title, error, saving
- `save()`, `toggleActive()`, `deactivate()`
- Takes shortCode, initialUrl, initialTitle, isActive, onUpdated

### `useAuth.ts`
Shared between login/signup pages.
- `signIn(email, password)`, `signUp(email, password)`, `signInWithGoogle()`
- Manages: error, loading state
- Uses Supabase browser client

---

## 2. Landing Page Split

Current: 365 lines in single page.tsx.

Target:
```
src/app/page.tsx                    — ~50 lines, imports + composition
src/components/landing/
  ├── HeroSection.tsx               — URL form + result display (~80 lines)
  ├── FeaturesSection.tsx           — feature cards grid (~60 lines)
  ├── PricingSection.tsx            — 3 plan cards (~80 lines)
  └── Footer.tsx                    — footer with contact (~30 lines)
```

HeroSection uses `useCopyToClipboard` hook. Form logic stays in HeroSection
(simple enough — just 1 fetch call for anonymous shorten).

---

## 3. API Layer Cleanup (`src/lib/api.ts`)

Current: 4 functions with identical error handling (76 lines).

Refactor: extract internal `apiFetch(method, path, body?)` with single error handling.
`apiGet`, `apiPost`, `apiPatch`, `apiDelete` become one-liners.

---

## 4. Auth Pages Consolidation

Current: login (156 lines) + signup (134 lines) with ~70% duplicate code.

Create `src/components/auth/AuthForm.tsx`:
- Shared: form layout, email/password inputs, Google OAuth button, error display
- Props: `mode: "login" | "signup"`, `onSubmit`, title, subtitle, footer link

Login/signup pages become ~40 lines each (AuthForm + mode-specific logic via `useAuth`).

---

## 5. Dashboard Pages Cleanup

### Links page (202 lines)
- Extract `LinksTable` component (table markup + rows)
- Page keeps: search state, pagination, SWR call via `useApiSWR`
- Use `useCopyToClipboard` hook

### Link detail page (167 lines)
- Extract `LinkHeader` component (title, copy button, stats summary)
- Use `useApiSWR` for data fetching
- Use `useCopyToClipboard` hook

### Settings page (140 lines)
- Replace manual useEffect with `useApiSWR` for `/api/me`
- Keep structure as-is (not large enough to split further)

### CreateLinkDialog (165 lines)
- Extract form state to `useCreateLink` hook
- Dialog component becomes ~60 lines (just renders form UI)

### EditLinkForm (123 lines)
- Extract to `useEditLink` hook
- Component becomes ~50 lines (just renders form UI)

---

## What NOT to do (YAGNI)

- No component library (Button, Input) — Tailwind utility classes suffice
- No react-hook-form/zod — forms are simple enough
- No generic DataTable — only 2 tables in the app
- No changes to analytics/ components — already clean presentational
- No changes to theme-provider/theme-toggle — already clean
- No changes to Sidebar/Header — small enough, well-isolated

---

## Implementation Order

### Phase 1: Hooks + API layer
1. Create `src/hooks/useCopyToClipboard.ts`
2. Create `src/hooks/useApiSWR.ts`
3. Refactor `src/lib/api.ts` (extract apiFetch)
4. Create `src/hooks/useAuth.ts`

### Phase 2: Landing page split
5. Create `src/components/landing/HeroSection.tsx`
6. Create `src/components/landing/FeaturesSection.tsx`
7. Create `src/components/landing/PricingSection.tsx`
8. Create `src/components/landing/Footer.tsx`
9. Rewrite `src/app/page.tsx` as composition

### Phase 3: Auth consolidation
10. Create `src/components/auth/AuthForm.tsx`
11. Rewrite login/page.tsx
12. Rewrite signup/page.tsx

### Phase 4: Dashboard cleanup
13. Create `src/hooks/useCreateLink.ts` + simplify CreateLinkDialog
14. Create `src/hooks/useEditLink.ts` + simplify EditLinkForm
15. Extract `LinksTable` + refactor links/page.tsx
16. Extract `LinkHeader` + refactor [code]/page.tsx
17. Refactor settings/page.tsx (useApiSWR)

### Verification
After each phase:
- `pnpm --filter web typecheck`
- `pnpm --filter web build`
- Visual check that pages render correctly
