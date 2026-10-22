'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

/**
 * The prototype's stand-in for a signed-in session: what the visitor has done in this tab
 * (registered for an event, joined a waitlist, requested mentorship). It is held in
 * sessionStorage so it survives moving between pages, and disappears with the tab. Nothing is
 * sent anywhere, and no form data (names, IDs, emails) is ever stored.
 *
 * When the platform API exists, these actions become API calls and this state comes from the
 * server; the components that use `useDemoSession()` keep the same shape.
 */

/** 'cancelled' overrides a registration the sample member already holds in the records. */
export type RegistrationState = 'registered' | 'waitlisted' | 'cancelled'
export type MentorshipState = 'pending' | 'accepted'

interface SessionState {
  registrations: Record<string, RegistrationState>
  mentorship: Record<string, MentorshipState>
  /** The prototype membership form was completed in this tab. */
  member: boolean
}

interface SessionApi extends SessionState {
  ready: boolean
  register: (slug: string, state: RegistrationState) => void
  cancel: (slug: string) => void
  requestMentorship: (graduateId: string, autoAccept: boolean) => void
  withdrawMentorship: (graduateId: string) => void
  completeMembership: () => void
}

const KEY = 'es-demo-session'
const EMPTY: SessionState = { registrations: {}, mentorship: {}, member: false }

const Ctx = createContext<SessionApi | null>(null)

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(EMPTY)
  const [ready, setReady] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    let saved: SessionState | null = null
    try {
      const raw = sessionStorage.getItem(KEY)
      if (raw) saved = { ...EMPTY, ...JSON.parse(raw) }
    } catch {
      // Storage unavailable (private mode): the session simply starts empty each page.
    }
    // Reading browser storage can only happen after mount; this is the one sync from it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setState(saved)
    setReady(true)
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Ignore: the state still works for this page.
    }
  }, [state, ready])

  const register = useCallback((slug: string, value: RegistrationState) => {
    setState((s) => ({ ...s, registrations: { ...s.registrations, [slug]: value } }))
  }, [])

  const cancel = useCallback((slug: string) => {
    setState((s) => ({ ...s, registrations: { ...s.registrations, [slug]: 'cancelled' } }))
  }, [])

  const requestMentorship = useCallback((id: string, autoAccept: boolean) => {
    setState((s) => ({ ...s, mentorship: { ...s.mentorship, [id]: 'pending' } }))
    // Prototype only: an "open" mentor accepts after a moment so the full flow can be seen.
    if (autoAccept) {
      timers.current.push(
        window.setTimeout(() => {
          setState((s) => (s.mentorship[id] === 'pending' ? { ...s, mentorship: { ...s.mentorship, [id]: 'accepted' } } : s))
        }, 2600),
      )
    }
  }, [])

  const withdrawMentorship = useCallback((id: string) => {
    setState((s) => {
      const mentorship = { ...s.mentorship }
      delete mentorship[id]
      return { ...s, mentorship }
    })
  }, [])

  const completeMembership = useCallback(() => setState((s) => ({ ...s, member: true })), [])

  const api = useMemo<SessionApi>(
    () => ({ ...state, ready, register, cancel, requestMentorship, withdrawMentorship, completeMembership }),
    [state, ready, register, cancel, requestMentorship, withdrawMentorship, completeMembership],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

const subscribeNever = () => () => {}

/**
 * The session as the calling component may render it. Until that component has hydrated it
 * sees the empty session the server rendered with: a Suspense boundary can hydrate after the
 * stored session has loaded, and must still match the server HTML first.
 */
export function useDemoSession(): SessionApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDemoSession must be used inside DemoSessionProvider')
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)
  return hydrated ? ctx : { ...ctx, ...EMPTY, ready: false }
}
