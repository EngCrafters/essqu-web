'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

/**
 * Filter, search and sort state that lives in the URL, so a filtered view can be shared and
 * survives a reload. Updates go through `history.replaceState`, which Next.js syncs with
 * `useSearchParams` without a server round trip: filtering is instant and never refetches.
 *
 * Lists are stored comma-separated (`?discipline=civil,mechanical`).
 */
export function useQueryState<K extends string>(keys: readonly K[]) {
  const params = useSearchParams()

  const values = useMemo(() => {
    const out = {} as Record<K, string>
    for (const k of keys) out[k] = params.get(k) ?? ''
    return out
  }, [params, keys])

  const lists = useMemo(() => {
    const out = {} as Record<K, string[]>
    for (const k of keys) out[k] = (params.get(k) ?? '').split(',').filter(Boolean)
    return out
  }, [params, keys])

  const write = useCallback((next: URLSearchParams) => {
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [])

  const set = useCallback(
    (updates: Partial<Record<K, string | string[] | null>>) => {
      const next = new URLSearchParams(window.location.search)
      for (const [k, v] of Object.entries(updates) as [K, string | string[] | null][]) {
        const value = Array.isArray(v) ? v.join(',') : v
        if (value) next.set(k, value)
        else next.delete(k)
      }
      write(next)
    },
    [write],
  )

  const toggle = useCallback(
    (key: K, value: string) => {
      const current = (new URLSearchParams(window.location.search).get(key) ?? '').split(',').filter(Boolean)
      set({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] } as Partial<Record<K, string[]>>)
    },
    [set],
  )

  const clear = useCallback(
    (only?: K[]) => {
      const next = new URLSearchParams(window.location.search)
      for (const k of only ?? keys) next.delete(k)
      write(next)
    },
    [keys, write],
  )

  const activeCount = keys.reduce((n, k) => n + (k === 'sort' ? 0 : lists[k].length), 0)

  return { values, lists, set, toggle, clear, activeCount }
}

/** Accent- and case-insensitive text match across the given strings. */
export function matchesQuery(query: string, ...fields: (string | undefined)[]) {
  const q = normalise(query)
  if (!q) return true
  const hay = normalise(fields.filter(Boolean).join(' '))
  return q.split(/\s+/).every((word) => hay.includes(word))
}

function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ْـ]/g, '') // Arabic diacritics and tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}
