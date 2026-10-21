'use client'

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'
import { memberAuthClient, type MemberAuthSettings } from './client'
import { fetchOwnMembership } from './membership'

/**
 * Who is signed in to this browser, for the navbar and the profile (Core's ADR 0023). The session
 * is Supabase Auth's own (client.ts); this only reflects it:
 * - on load, synchronously from the stored session, so the navbar draws the right state at once;
 * - then confirmed with Supabase Auth and Core: whether the person is an approved member, their
 *   name and photo. Signing in grants nothing: membership is Core's answer, never the session's.
 * It follows sign-in, email confirmation, sign-out, token refresh and other tabs.
 */
/** member: approved and active. applicant: an application in progress or decided. none: an
 *  account with neither (for example a dashboard user). checking: Core has not answered yet. */
export type AccountKind = 'member' | 'applicant' | 'none' | 'checking'
export type MemberAccount =
  | { status: 'unknown' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; userId: string; email: string; kind: AccountKind; name: string | null; photoUrl: string | null }

type Summary = { userId: string; kind: Exclude<AccountKind, 'checking'>; name: string | null; hasPhoto: boolean }

const SESSION_KEY = 'es-member-auth'
const SUMMARY_KEY = 'es-member-summary'
const UNKNOWN: MemberAccount = { status: 'unknown' }
const SIGNED_OUT: MemberAccount = { status: 'signed-out' }

function read(storage: () => Storage, key: string) {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}
function storedSession(): { userId: string; email: string } | null {
  const raw = read(() => localStorage, SESSION_KEY) ?? read(() => sessionStorage, SESSION_KEY)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as { user?: { id?: unknown; email?: unknown }; refresh_token?: unknown }
    return typeof s.user?.id === 'string' && typeof s.refresh_token === 'string'
      ? { userId: s.user.id, email: typeof s.user.email === 'string' ? s.user.email : '' }
      : null
  } catch {
    return null
  }
}
/** Not secret: name, kind and whether a photo exists, to draw the avatar before Core answers. */
function cachedSummary(userId: string): Summary | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(SUMMARY_KEY) ?? 'null') as Summary | null
    return s?.userId === userId ? s : null
  } catch {
    return null
  }
}
function saveSummary(summary: Summary | null) {
  try {
    if (summary) sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(summary))
    else sessionStorage.removeItem(SUMMARY_KEY)
  } catch {
    // Storage unavailable: the avatar simply waits for Core.
  }
}

export type AccountStore = ReturnType<typeof createAccountStore>

export function createAccountStore(settings: MemberAuthSettings | null, coreBase: string | null) {
  let snapshot: MemberAccount = UNKNOWN
  let started = false
  let photoUrl: string | null = null
  let generation = 0
  const listeners = new Set<() => void>()
  const set = (next: MemberAccount) => {
    snapshot = next
    for (const l of listeners) l()
  }
  const setPhoto = (url: string | null) => {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    photoUrl = url
  }

  async function confirm() {
    const mine = ++generation
    if (!settings) return set(SIGNED_OUT)
    const client = memberAuthClient(settings)
    const { data } = await client.auth.getSession().catch(() => ({ data: { session: null } }))
    if (mine !== generation) return
    const session = data.session
    if (!session) {
      saveSummary(null)
      setPhoto(null)
      return set(SIGNED_OUT)
    }
    const base = { status: 'signed-in' as const, userId: session.user.id, email: session.user.email ?? '' }
    const cached = cachedSummary(base.userId)
    if (snapshot.status !== 'signed-in' || snapshot.userId !== base.userId)
      set({ ...base, kind: cached?.kind ?? 'checking', name: cached?.name ?? null, photoUrl: null })
    if (!coreBase) return
    const membership = await fetchOwnMembership(coreBase, session.access_token)
    if (mine !== generation) return
    if (membership.kind === 'signed-out') return void client.auth.signOut({ scope: 'local' }).catch(() => null)
    if (membership.kind === 'unavailable') return
    if (membership.kind !== 'member') {
      const kind = membership.kind === 'application' ? 'applicant' : 'none'
      saveSummary({ userId: base.userId, kind, name: null, hasPhoto: false })
      setPhoto(null)
      return set({ ...base, kind, name: null, photoUrl: null })
    }
    const profile = await fetch(`${coreBase}/me/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
    if (mine !== generation) return
    const name = typeof profile?.data?.name === 'string' ? profile.data.name : null
    const hasPhoto = profile?.data?.hasPhoto === true
    let url: string | null = null
    if (hasPhoto) {
      const blob = await fetch(`${coreBase}/me/profile/photo`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      })
        .then((r) => (r.ok && r.headers.get('content-type') === 'image/jpeg' ? r.blob() : null))
        .catch(() => null)
      if (mine !== generation) return
      url = blob ? URL.createObjectURL(blob) : null
    }
    setPhoto(url)
    saveSummary({ userId: base.userId, kind: 'member', name, hasPhoto })
    set({ ...base, kind: 'member', name, photoUrl: url })
  }

  function start() {
    if (started || typeof window === 'undefined') return
    started = true
    // Draw the right state immediately from storage; Supabase and Core confirm it next.
    const stored = settings ? storedSession() : null
    if (!stored) set(SIGNED_OUT)
    else {
      const cached = cachedSummary(stored.userId)
      set({ status: 'signed-in', ...stored, kind: cached?.kind ?? 'checking', name: cached?.name ?? null, photoUrl: null })
    }
    if (!settings) return
    void confirm()
    memberAuthClient(settings).auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        generation++
        saveSummary(null)
        setPhoto(null)
        set(SIGNED_OUT)
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        // Deferred: Supabase holds a lock while it notifies listeners.
        setTimeout(() => void confirm(), 0)
      }
    })
    // Another tab signed in or out.
    window.addEventListener('storage', (e) => {
      if (e.key === SESSION_KEY) void confirm()
    })
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      start()
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => UNKNOWN,
    /** After a profile edit or a new photo: re-read name and photo from Core. */
    refresh: () => confirm(),
    async signOut() {
      generation++
      saveSummary(null)
      setPhoto(null)
      set(SIGNED_OUT)
      if (settings) await memberAuthClient(settings).auth.signOut({ scope: 'local' }).catch(() => null)
    },
  }
}

const AccountContext = createContext<AccountStore | null>(null)

export function MemberAccountProvider({ settings, coreBase, children }: { settings: MemberAuthSettings | null; coreBase: string | null; children: ReactNode }) {
  const [store] = useState(() => createAccountStore(settings, coreBase))
  return <AccountContext.Provider value={store}>{children}</AccountContext.Provider>
}

/** The signed-in account and its actions; `unknown` only before the first client render. */
export function useMemberAccount() {
  const store = useContext(AccountContext)
  const fallback = useState(() => createAccountStore(null, null))[0]
  const active = store ?? fallback
  const account = useSyncExternalStore(active.subscribe, active.getSnapshot, active.getServerSnapshot)
  return { account, refresh: active.refresh, signOut: active.signOut }
}
